import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import type { IStructuredLogger } from '@zoom/utils';
import { LOGGER_PORT } from '@zoom/utils';
import { APIError } from 'better-auth';
import { getOAuthState } from 'better-auth/api';
import { AuditLogServicePort } from '../../application/ports/out/audit-log-service.port';
import { JwkRepositoryPort } from '../../application/ports/out/jwk-repository.port';
import { JwtMintServicePort } from '../../application/ports/out/jwt-mint-service.port';
import { OAuthSystemContextStorePort } from '../../application/ports/out/oauth-system-context-store.port';
import { PendingTermsStorePort } from '../../application/ports/out/pending-terms-store.port';
import { SystemAuditLogPort } from '../../application/ports/out/system-audit-log.port';
import type { SystemContext } from '../../application/ports/out/system-key-service.port';
import { SystemMembershipRepositoryPort } from '../../application/ports/out/system-membership-repository.port';
import { UserTermsAcceptanceRepositoryPort } from '../../application/ports/out/user-terms-acceptance-repository.port';
import { AccessDeniedException } from '../../domain/exceptions/access-denied.exception';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { hashIp } from '../../shared/utils/hash-ip';
import { parseDeviceName } from '../../shared/utils/parse-device-name';
import { resolveClientIp } from '../../shared/utils/resolve-client-ip';

// ---------------------------------------------------------------------------
// SocialCallbackHook — handles /callback/:id lifecycle.
//
// @BeforeHook: injects services into ctx.context so auth.ts databaseHooks can
//   access them during the route handler execution.
//
// @AfterHook: retrieves correlationId from the parsed OAuth state, consumes
//   the system context from Redis, consumes the pending terms Redis entry,
//   writes user_terms_acceptance, and emits telemetry + audit log.
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class SocialCallbackHook {
	constructor(
		@Inject(PendingTermsStorePort)
		private readonly pendingTermsStore: PendingTermsStorePort,
		@Inject(AuditLogServicePort)
		private readonly auditLogService: AuditLogServicePort,
		@Inject(UserTermsAcceptanceRepositoryPort)
		private readonly termsAcceptanceRepo: UserTermsAcceptanceRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
		@Inject(JwkRepositoryPort)
		private readonly jwkRepo: JwkRepositoryPort,
		@Inject(JwtMintServicePort)
		private readonly jwtMintService: JwtMintServicePort,
		@Inject(SystemMembershipRepositoryPort)
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		@Inject(SystemAuditLogPort)
		private readonly systemAuditLog: SystemAuditLogPort,
		@Inject(OAuthSystemContextStorePort)
		private readonly oauthSystemCtxStore: OAuthSystemContextStorePort,
	) {}

	@BeforeHook('/callback/:id')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;
		ctx.context.auditLogService = this.auditLogService;
		ctx.context.systemAuditLog = this.systemAuditLog;

		// Inject the store so databaseHooks.session.create.before can resolve
		// systemResolution lazily (getOAuthState() is only available after
		// parseState() runs inside the route handler, not here in the BeforeHook).
		ctx.context.oauthSystemCtxStore = this.oauthSystemCtxStore;
	}

	@AfterHook('/callback/:id')
	async after(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		// Retrieve correlationId embedded in OAuth state by SocialSignInHook.
		// getOAuthState() works here because parseState() ran inside the route handler.
		const state = await getOAuthState();
		const correlationId =
			typeof state?.correlationId === 'string'
				? state.correlationId
				: undefined;

		// --- System context from Redis ---
		const systemContext = correlationId
			? await this.oauthSystemCtxStore.consume(correlationId)
			: null;

		if (!systemContext) {
			void this.systemAuditLog
				.log({ eventType: 'oauth_context_lost' })
				.catch(() => undefined);
			throw new APIError(401, { error: 'oauth_context_lost' });
		}

		// Consume the pending terms entry if we have a correlationId.
		// Returns null for returning users (no pending entry) — that is fine.
		const entry = correlationId
			? await this.pendingTermsStore.consume(correlationId)
			: null;

		// Extract userId from the newly created session.
		const newSession = ctx.context.newSession as
			| { user?: { id?: string } }
			| undefined;
		const userId =
			typeof newSession?.user?.id === 'string' ? newSession.user.id : undefined;
		if (!userId) return;

		const ip = resolveClientIp(ctx);
		const userAgent = ctx.getHeader('user-agent') ?? '';
		const ipHash = hashIp(ip);

		// Always mint the system-scoped JWT — covers both first-time sign-ups and
		// returning users authenticating via OAuth (no pending terms entry).
		await this.mintJwtForOAuthUser(userId, systemContext, ctx);

		// deviceId is resolved by DeviceHook (@AfterHook '/callback/:id'),
		// which runs before this hook in the registration order.
		const deviceId = ctx.context.deviceId as string | undefined;

		// Immutable audit log for successful social sign-in — written here so
		// correlationId, systemId, deviceId, and loginMethod (provider) are all available.
		await this.auditLogService.logLoginAttempt({
			userId,
			systemId: systemContext.systemId,
			loginMethod: entry?.provider ?? 'social',
			ipAddress: ip,
			userAgent,
			deviceName: parseDeviceName(userAgent),
			correlationId: correlationId ?? undefined,
			deviceId,
			success: true,
		});

		// Write terms acceptance and emit audit events only for first-time sign-ups.
		if (entry) {
			// Write user_terms_acceptance. ON CONFLICT DO NOTHING makes this idempotent.
			try {
				await this.termsAcceptanceRepo.create({
					userId,
					systemId: entry.systemId,
					systemTermsId: entry.systemTermsId,
					sessionId: null,
					ipAddress:
						entry.ipAddress && entry.ipAddress !== 'unknown'
							? entry.ipAddress
							: null,
					userAgent: entry.userAgent || null,
				});
			} catch (err) {
				const code = (err as { code?: string }).code ?? 'DB_ERROR';
				this.logger.error(
					{ event: 'social_auth.terms_write_error', code },
					'Failed to write user_terms_acceptance for social sign-up',
				);
			}

			recordAuthEvent('social_auth_succeeded', { provider: entry.provider });

			this.auditLogService
				.logSocialAuthEvent({
					correlationId: correlationId as string,
					eventType: 'social_signup_success',
					providerId: entry.provider,
					ipHash,
					userAgent,
					userId,
				})
				.catch(() => {});
		}
	}

	private async mintJwtForOAuthUser(
		userId: string,
		systemContext: SystemContext,
		ctx: AuthHookContext,
	): Promise<void> {
		const newSession = ctx.context.newSession as
			| {
					user?: {
						id?: string;
						email?: string;
						emailVerified?: boolean;
					};
					session?: { id?: string };
			  }
			| undefined;

		const email =
			typeof newSession?.user?.email === 'string' ? newSession.user.email : '';
		const emailVerified =
			typeof newSession?.user?.emailVerified === 'boolean'
				? newSession.user.emailVerified
				: false;
		const sessionId =
			typeof newSession?.session?.id === 'string' ? newSession.session.id : '';

		const { role } = await this.resolveMembership(userId, systemContext);

		const jwk = await this.jwkRepo.getActiveKey();
		if (!jwk) return; // no signing key — skip JWT gracefully; don't break OAuth login

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

		const returned = ctx.context.returned as
			| Record<string, unknown>
			| undefined;
		if (returned) {
			returned.jwt = token;
		}

		void this.systemAuditLog
			.log({
				eventType: 'jwt_issued',
				systemId: systemContext.systemId,
				details: { userId, role, sessionId },
			})
			.catch(() => undefined);
	}

	private async resolveMembership(
		userId: string,
		systemContext: SystemContext,
	): Promise<{ role: string }> {
		const existing = await this.membershipRepo.findByUserAndOrg(
			userId,
			systemContext.organizationId,
		);

		if (existing) {
			if (existing.status !== 'active' || existing.isDeleted) {
				throw new AccessDeniedException();
			}
			return { role: existing.role };
		}

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
