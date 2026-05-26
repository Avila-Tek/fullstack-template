import { Inject, Injectable } from '@nestjs/common';
import {
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import type Redis from 'ioredis';
import { SessionAuditLogRepositoryPort } from '../../application/ports/out/session-audit-log-repository.port';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { hashIp } from '../../shared/utils/hash-ip';
import { auth } from '../better-auth/auth';
import { REDIS_CLIENT } from '../redis/redis.constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignOutDeps {
	redis: Pick<Redis, 'del'>;
	sessionAuditLog: Pick<SessionAuditLogRepositoryPort, 'insertEvent'>;
}

export interface SignOutParams {
	userId: string;
	sessionId: string;
	ipHash: string;
	correlationId: string;
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing
// ---------------------------------------------------------------------------

export async function handleSignOutBefore(
	params: SignOutParams,
	deps: SignOutDeps,
): Promise<void> {
	auditLogger.info({
		level: 'security',
		event: 'logout_succeeded',
		userId: params.userId,
		sessionId: params.sessionId,
		ipHash: params.ipHash,
		correlationId: params.correlationId,
		resultStatus: 'success',
	});
	recordAuthEvent('logout_succeeded');

	// Clear Redis inactivity key before session row is deleted
	// if this fails, the key will expire due to its TTL
	void deps.redis
		.del(`session:${params.sessionId}:activity`)
		.catch(() => undefined);

	// Write structured audit record via port
	void deps.sessionAuditLog
		.insertEvent({
			userId: params.userId,
			sessionId: params.sessionId,
			eventType: 'session_logout',
			correlationId: params.correlationId,
		})
		.catch(() => undefined);
}

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
//
// Uses @BeforeHook('/sign-out') so the session row is still present in the DB
// when we read it. @AfterHook fires after the session is already deleted and
// the userId is no longer available, which is why we use Before here.
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class SignOutHook {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(SessionAuditLogRepositoryPort)
		private readonly sessionAuditLog: SessionAuditLogRepositoryPort,
	) {}

	@BeforeHook('/sign-out')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		// Session is still valid at this point — Better Auth deletes it after
		// all before-hooks complete.
		const result = await auth.api.getSession({ headers: ctx.request.headers });
		if (!result) return;

		const correlationId =
			ctx.request.headers.get('x-correlation-id') ?? crypto.randomUUID();
		const ipHash = hashIp(result.session.ipAddress ?? '');

		await handleSignOutBefore(
			{
				userId: result.user.id,
				sessionId: result.session.id,
				ipHash,
				correlationId,
			},
			{ redis: this.redis, sessionAuditLog: this.sessionAuditLog },
		);
	}
}
