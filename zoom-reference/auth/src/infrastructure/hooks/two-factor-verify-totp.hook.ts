import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import type Redis from 'ioredis';
import { BruteForceServicePort } from '../../application/ports/out/brute-force-service.port';
import { TwoFactorActivateUnitOfWorkPort } from '../../application/ports/out/two-factor-activate-unit-of-work.port';
import { TwoFactorAuditLogRepositoryPort } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { activateTwoFactor } from '../../application/use-cases/activateTwoFactor.use-case';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { compensateTwoFactorEnable } from '../../shared/utils/compensate-two-factor-enable';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { auth } from '../better-auth/auth';
import { REDIS_CLIENT } from '../redis/redis.constants';

// Better Auth applies ±1 period tolerance for TOTP, so a code from the previous
// period is still accepted. The replay window must cover both periods to prevent
// a replayed code from succeeding within the tolerance window.

@Hook()
@Injectable()
export class TwoFactorVerifyTotpHook {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(BruteForceServicePort)
		private readonly bruteForce: BruteForceServicePort,
		@Inject(TwoFactorAuditLogRepositoryPort)
		private readonly twoFactorAuditLog: TwoFactorAuditLogRepositoryPort,
		@Inject(TwoFactorActivateUnitOfWorkPort)
		private readonly uow: TwoFactorActivateUnitOfWorkPort,
	) {}

	@BeforeHook('/two-factor/verify-totp')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		let userId: string | undefined;

		// Method 1: Try to get session (enrollment path)
		const result = await auth.api.getSession({ headers: ctx.request.headers });

		if (result) {
			userId = result.user.id;
			ctx.context.totpIsEnrollment = true;
		} else {
			// Method 2: During 2FA challenge, read the 2FA cookie to get the user
			const twoFactorCookieName =
				ctx.context.createAuthCookie('two_factor').name;
			const signedTwoFactorCookie = await ctx.getSignedCookie(
				twoFactorCookieName,
				ctx.context.secret,
			);

			if (signedTwoFactorCookie) {
				const verificationToken =
					await ctx.context.internalAdapter.findVerificationValue(
						signedTwoFactorCookie,
					);

				if (verificationToken) {
					userId = verificationToken.value;
				}
			}
			ctx.context.totpIsEnrollment = false;
		}

		if (!userId) return;

		// Task 2a: Check TOTP lock before processing verification
		const lockKey = `2fa_challenge:${userId}`;
		const failureCount = await this.bruteForce.getCount(lockKey);
		if (failureCount >= env.TOTP_MAX_FAILURES) {
			throw new APIError(429, { code: 'AUTH_2FA_LOCKED' });
		}

		const body = ctx.body as Record<string, unknown> | undefined;
		const code = typeof body?.code === 'string' ? body.code : '';
		const codeHash = createHash('sha256').update(code).digest('hex');

		// Store for use in the after hook
		ctx.context.totpCodeHash = codeHash;
		ctx.context.totpUserId = userId;

		const replayKey = `2fa_totp_used:${userId}:${codeHash}`;
		const existing = await this.redis.get(replayKey);

		if (existing) {
			throw new APIError(422, { code: 'AUTH_2FA_TOTP_REPLAY' });
		}
	}

	@AfterHook('/two-factor/verify-totp')
	async after(ctx: AuthHookContext): Promise<void> {
		const codeHash = ctx.context.totpCodeHash as string | undefined;
		const userId = ctx.context.totpUserId as string | undefined;
		if (!codeHash || !userId) return;

		if (!ctx.request) return;

		const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

		// BA rewrites the session on TOTP enrollment and returns via valid(ctx).
		// ctx.context.returned.user.id presence is the authoritative success signal.
		const returned = ctx.context.returned as
			| { user?: { id: string; [key: string]: unknown } }
			| undefined;
		const isSuccess = typeof returned?.user?.id === 'string';

		const lockKey = `2fa_challenge:${userId}`;
		const replayKey = `2fa_totp_used:${userId}:${codeHash}`;

		const isEnrollment = !!ctx.context.totpIsEnrollment;

		if (isSuccess) {
			await this.redis.set(
				replayKey,
				'1',
				'EX',
				env.TOTP_REPLAY_WINDOW_SECONDS,
			);
			await this.bruteForce.clear(lockKey);
			await this.logSuccess(
				userId,
				correlationId,
				userAgent,
				ipHash,
				isEnrollment,
			);

			if (isEnrollment) {
				try {
					await activateTwoFactor(
						{ uow: this.uow, correlationId, ipHash, userAgent },
						{
							userId,
							insertParams: { method: 'totp', verifiedAt: new Date() },
						},
					);
				} catch (err) {
					// BA rotated the session before we ran; updateUser inside compensate
					// calls refreshUserSessions which updates Redis — no need to re-set cookie.
					await compensateTwoFactorEnable(ctx, userId);
					throw err;
				}
			}
			return;
		}

		// On failure, increment counter first (atomic Redis, independent of audit DB)
		const newCount = await this.bruteForce.increment(lockKey);

		await this.logFailure(
			userId,
			correlationId,
			userAgent,
			ipHash,
			isEnrollment,
		);

		if (newCount >= env.TOTP_MAX_FAILURES) {
			await this.logLocked(userId, correlationId, userAgent, ipHash);
		}
	}

	private async logSuccess(
		userId: string,
		correlationId: string,
		userAgent: string,
		ipHash: string,
		isEnrollment: boolean,
	) {
		const eventType = isEnrollment
			? '2fa_enrollment_succeeded'
			: '2fa_challenge_succeeded';
		await this.twoFactorAuditLog.insertEvent({
			eventType,
			userId,
			correlationId,
			method: 'totp',
			ipHash,
			userAgent,
		});
		auditLogger.info({
			level: 'security',
			event: eventType,
			method: 'totp',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent(
			isEnrollment ? '2fa_enrollment_succeeded' : '2fa_challenge_success',
		);
	}

	private async logLocked(
		userId: string,
		correlationId: string,
		userAgent: string,
		ipHash: string,
	) {
		await this.twoFactorAuditLog.insertEvent({
			eventType: '2fa_challenge_locked',
			userId,
			correlationId,
			method: 'totp',
			ipHash,
			userAgent,
		});
		auditLogger.warn({
			level: 'security',
			event: '2fa_challenge_locked',
			method: 'totp',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent('2fa_challenge_locked');
	}

	private async logFailure(
		userId: string,
		correlationId: string,
		userAgent: string,
		ipHash: string,
		isEnrollment: boolean,
	) {
		const eventType = isEnrollment
			? '2fa_enrollment_failed'
			: '2fa_challenge_failed';
		await this.twoFactorAuditLog.insertEvent({
			eventType,
			userId,
			correlationId,
			method: 'totp',
			ipHash,
			userAgent,
		});
		auditLogger.warn({
			level: 'security',
			event: eventType,
			method: 'totp',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent(eventType);
	}
}
