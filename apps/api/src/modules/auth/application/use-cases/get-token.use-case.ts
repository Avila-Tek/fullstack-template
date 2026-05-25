import {
	Inject,
	Injectable,
	InternalServerErrorException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { AccessDeniedException } from '../../domain/exceptions/access-denied.exception';
import { SessionExpiredException } from '../../domain/exceptions/session-expired.exception';
import { SessionInvalidatedException } from '../../domain/exceptions/session-invalidated.exception';
import { env } from '../../env';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import {
	type GetTokenParams,
	GetTokenUseCasePort,
} from '../ports/in/get-token.use-case.port';
import { JwkRepositoryPort } from '../ports/out/jwk-repository.port';
import { JwtMintServicePort } from '../ports/out/jwt-mint-service.port';
import { SessionAuditLogRepositoryPort } from '../ports/out/session-audit-log-repository.port';
import { SessionRepositoryPort } from '../ports/out/session-repository.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import type { SystemContext } from '../ports/out/system-key-service.port';
import { SystemMembershipRepositoryPort } from '../ports/out/system-membership-repository.port';

@Injectable()
export class GetTokenUseCase implements GetTokenUseCasePort {
	constructor(
		@Inject(SystemMembershipRepositoryPort)
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		@Inject(JwkRepositoryPort)
		private readonly jwkRepo: JwkRepositoryPort,
		@Inject(JwtMintServicePort)
		private readonly jwtMintService: JwtMintServicePort,
		@Inject(SystemAuditLogPort)
		private readonly systemAuditLog: SystemAuditLogPort,
		@Inject(SessionRepositoryPort)
		private readonly sessionRepo: SessionRepositoryPort,
		@Inject(SessionAuditLogRepositoryPort)
		private readonly sessionAuditLog: SessionAuditLogRepositoryPort,
		@Inject(REDIS_CLIENT)
		private readonly redis: Redis,
	) {}

	async execute(params: GetTokenParams): Promise<{ token: string }> {
		const {
			userId,
			sessionId,
			email,
			emailVerified,
			systemContext,
			sessionCreatedAt,
			correlationId,
		} = params;

		recordAuthEvent('jwt_refresh_attempted');

		// Step 1: Redis inactivity check
		const key = `session:${sessionId}:activity`;
		const active = await this.redis.get(key);
		if (active === null) {
			await this.sessionRepo.deleteById(sessionId);
			void this.sessionAuditLog
				.insertEvent({
					eventType: 'session_expired_inactivity',
					userId,
					sessionId,
					correlationId,
					systemId: systemContext.systemId,
				})
				.catch(() => undefined);
			recordAuthEvent('session_expired_inactivity');
			recordAuthEvent('jwt_refresh_failed');
			throw new SessionExpiredException();
		}

		// Step 2: session_invalid_before check
		const sessionData = await this.sessionRepo.findByIdWithUser(sessionId);
		if (sessionData === null) {
			void this.redis
				.del(`session:${sessionId}:activity`)
				.catch(() => undefined);
			void this.sessionAuditLog
				.insertEvent({
					eventType: 'session_invalidated_credential_change',
					userId,
					sessionId,
					correlationId,
					systemId: systemContext.systemId,
				})
				.catch(() => undefined);
			recordAuthEvent('jwt_refresh_failed');
			throw new SessionInvalidatedException();
		}
		const sessionInvalidBefore = sessionData?.sessionInvalidBefore ?? null;
		if (sessionInvalidBefore && sessionCreatedAt < sessionInvalidBefore) {
			await this.sessionRepo.deleteById(sessionId);
			void this.redis
				.del(`session:${sessionId}:activity`)
				.catch(() => undefined);
			void this.sessionAuditLog
				.insertEvent({
					eventType: 'session_invalidated_credential_change',
					userId,
					sessionId,
					correlationId,
					systemId: systemContext.systemId,
				})
				.catch(() => undefined);
			recordAuthEvent('jwt_refresh_failed');
			throw new SessionInvalidatedException();
		}

		// Steps 3–5: resolve membership, get signing key, mint token
		const { role } = await this.resolveMembership(userId, systemContext);

		const jwk = await this.jwkRepo.getActiveKey();
		if (!jwk)
			throw new InternalServerErrorException(
				'No active signing key configured',
			);

		const token = await this.jwtMintService.mint(
			{
				sub: userId,
				email,
				emailVerified,
				sid: sessionId,
				orgId: systemContext.organizationId,
				role,
				aud: systemContext.apiBaseUrl,
			},
			jwk,
		);

		// Step 6: slide the inactivity TTL
		const timeoutSeconds = env.SESSION_INACTIVITY_TIMEOUT_MINUTES * 60;
		void this.redis.expire(key, timeoutSeconds).catch(() => undefined);

		// Step 7: structured session audit (fire-and-forget)
		void this.sessionAuditLog
			.insertEvent({
				eventType: 'jwt_refresh_succeeded',
				userId,
				sessionId,
				correlationId,
				systemId: systemContext.systemId,
			})
			.catch(() => undefined);

		// Step 8: system audit log
		void this.systemAuditLog
			.log({
				eventType: 'jwt_refresh_succeeded',
				systemId: systemContext.systemId,
				details: { userId, role, sessionId },
			})
			.catch(() => undefined);

		recordAuthEvent('jwt_refresh_succeeded');

		return { token };
	}

	private async resolveMembership(
		userId: string,
		systemContext: SystemContext,
	): Promise<{ role: string }> {
		const existing = await this.membershipRepo.findByUserAndOrg(
			userId,
			systemContext.organizationId,
		);

		if (existing) return { role: existing.role };

		if (systemContext.accessModel === 'restricted') {
			throw new AccessDeniedException();
		}

		// Open system — auto-enroll as member
		await this.membershipRepo.upsertMember({
			userId,
			systemId: systemContext.systemId,
			organizationId: systemContext.organizationId,
			role: 'member',
		});

		void this.systemAuditLog
			.log({
				eventType: 'open_system_auto_enrolled',
				systemId: systemContext.systemId,
				details: { userId },
			})
			.catch(() => undefined);

		return { role: 'member' };
	}
}
