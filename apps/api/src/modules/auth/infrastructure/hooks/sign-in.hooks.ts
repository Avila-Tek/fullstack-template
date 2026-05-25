import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { normalizeEmail } from '@zoom/utils';
import { APIError } from 'better-auth';
import { AuditLogServicePort } from '../../application/ports/out/audit-log-service.port';
import { BruteForceServicePort } from '../../application/ports/out/brute-force-service.port';
import { CaptchaServicePort } from '../../application/ports/out/captcha-service.port';
import { EmailServicePort } from '../../application/ports/out/email-service.port';
import { JwkRepositoryPort } from '../../application/ports/out/jwk-repository.port';
import { JwtMintServicePort } from '../../application/ports/out/jwt-mint-service.port';
import { SystemAuditLogPort } from '../../application/ports/out/system-audit-log.port';
import {
	type SystemContext,
	SystemKeyPort,
	type SystemKeyResolution,
} from '../../application/ports/out/system-key-service.port';
import { SystemMembershipRepositoryPort } from '../../application/ports/out/system-membership-repository.port';
import { TwoFactorRepositoryPort } from '../../application/ports/out/two-factor-repository.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { AccessDeniedException } from '../../domain/exceptions/access-denied.exception';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { hashIp } from '../../shared/utils/hash-ip';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { parseDeviceName } from '../../shared/utils/parse-device-name';
import { resolveClientIp } from '../../shared/utils/resolve-client-ip';
import { extractSystemKey } from '../system-key/system-key.utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SignInErrorType =
	| 'invalid_credentials'
	| 'email_not_verified'
	| 'rate_limited'
	| 'account_disabled'
	| 'unknown';

/**
 * Maps a Better Auth APIError to one of the permitted error_type values.
 * Better Auth error shape: { statusCode: number, body: { code?: string } }
 */
function deriveErrorType(returned: unknown): SignInErrorType {
	if (!returned || typeof returned !== 'object') return 'unknown';

	const err = returned as Record<string, unknown>;
	const body = err.body as Record<string, unknown> | undefined;
	const code = typeof body?.code === 'string' ? body.code : '';
	const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 0;

	if (code === 'INVALID_EMAIL_OR_PASSWORD') return 'invalid_credentials';
	if (code === 'EMAIL_NOT_VERIFIED') return 'email_not_verified';
	if (statusCode === 429) return 'rate_limited';

	return 'unknown';
}

function loginBruteForceKey(email: string): string {
	const normalized = normalizeEmail(email);
	return `login:bruteforce:${createHash('sha256').update(normalized).digest('hex')}`;
}

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class SignInHook {
	private readonly maxAttempts: number;

	constructor(
		@Inject(SystemKeyPort)
		private readonly systemKeyService: SystemKeyPort,
		@Inject(SystemMembershipRepositoryPort)
		private readonly membershipRepo: SystemMembershipRepositoryPort,
		@Inject(JwkRepositoryPort)
		private readonly jwkRepo: JwkRepositoryPort,
		@Inject(JwtMintServicePort)
		private readonly jwtMintService: JwtMintServicePort,
		@Inject(SystemAuditLogPort)
		private readonly systemAuditLog: SystemAuditLogPort,
		@Inject(CaptchaServicePort)
		private readonly captchaService: CaptchaServicePort,
		@Inject(BruteForceServicePort)
		private readonly bruteForce: BruteForceServicePort,
		@Inject(AuditLogServicePort)
		private readonly auditLogService: AuditLogServicePort,
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(UserRepositoryPort)
		private readonly userRepo: UserRepositoryPort,
		@Inject(TwoFactorRepositoryPort)
		private readonly twoFactorRepo: TwoFactorRepositoryPort,
	) {
		this.maxAttempts = env.BRUTE_FORCE_MAX_ATTEMPTS;
	}

	@BeforeHook('/sign-in/email')
	async handleBefore(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		// Step 1 (existing): resolve system key
		const resolution = await this.resolveSystemKey(ctx);
		ctx.context.systemResolution = resolution;
		ctx.context.systemAuditLog = this.systemAuditLog;

		const correlationId =
			ctx.getHeader('x-correlation-id') ?? crypto.randomUUID();
		ctx.context.correlationId = correlationId;

		// Step 2: Turnstile captcha verification
		const body = ctx.body as Record<string, unknown> | undefined;
		const captchaToken =
			typeof body?.captchaToken === 'string' ? body.captchaToken : '';

		if (!env.SKIP_CAPTCHA) {
			const captchaResult = await this.captchaService.verify(captchaToken);
			if (captchaResult.unavailable) {
				throw new APIError(503, { code: 'CAPTCHA_UNAVAILABLE' });
			}
			if (!captchaResult.success) {
				throw new APIError(400, { code: 'CAPTCHA_FAILED' });
			}
		}

		// Step 3: Brute-force check
		const email = typeof body?.email === 'string' ? body.email : '';
		const bruteForceKey = loginBruteForceKey(email);
		ctx.context.bruteForceKey = bruteForceKey;

		const count = await this.bruteForce.getCount(bruteForceKey);
		if (count >= this.maxAttempts) {
			const ipHash = hashIp(resolveClientIp(ctx));
			auditLogger.warn({
				level: 'security',
				event: 'login_blocked',
				correlationId,
				ipHash,
				emailHash: createHash('sha256')
					.update(normalizeEmail(email))
					.digest('hex'),
			});
			throw new APIError(429, { code: 'ACCOUNT_LOCKED' });
		}
	}

	@AfterHook('/sign-in/email')
	async handleAfter(ctx: AuthHookContext): Promise<void> {
		const bruteForceKey = ctx.context.bruteForceKey as string | undefined;
		const { ipAddress: ip, userAgent, ipHash } = extractHookTelemetry(ctx);
		const correlationId =
			(ctx.context.correlationId as string | undefined) ?? '';
		const systemKeyResolution = ctx.context.systemResolution as
			| SystemKeyResolution
			| undefined;

		const returned = ctx.context.returned;
		const user = (returned as Record<string, unknown> | undefined)?.user as
			| Record<string, unknown>
			| undefined;
		const userId = typeof user?.id === 'string' ? user.id : undefined;

		if (!userId) {
			// Failure path
			if (bruteForceKey) {
				const count = await this.bruteForce
					.increment(bruteForceKey)
					.catch((err) => {
						auditLogger.warn({
							level: 'security',
							event: 'brute_force_backend_failure',
							correlationId,
							err,
						});
						return Number.POSITIVE_INFINITY;
					});

				if (count >= this.maxAttempts) {
					void this.systemAuditLog
						.log({
							eventType: 'account_locked',
							systemId: systemKeyResolution?.systemId,
							details: { correlationId, ipHash },
						})
						.catch(() => undefined);
					auditLogger.warn({
						level: 'security',
						event: 'account_locked',
						correlationId,
						ipHash,
					});
					recordAuthEvent('account_locked', {});
				}

				// Dispatch failed login alert at threshold
				if (count === this.maxAttempts) {
					const email =
						typeof (ctx.body as Record<string, unknown> | undefined)?.email ===
						'string'
							? (ctx.body as Record<string, unknown>).email
							: '';
					if (email) {
						void this.dispatchFailedLoginAlert(
							email as string,
							correlationId,
							ip,
							userAgent,
						).catch(() => undefined);
					}
				}

				auditLogger.warn({
					level: 'security',
					event: 'brute_force_attempt',
					count,
					correlationId,
					ipHash,
				});
			}

			const errorType = deriveErrorType(returned);
			this.logFailure(
				correlationId,
				ipHash,
				userAgent,
				ip,
				errorType,
				systemKeyResolution?.systemId,
			);
			return;
		}

		// Success path: clear brute-force counter
		if (bruteForceKey) {
			void this.bruteForce.clear(bruteForceKey).catch(() => undefined);
		}

		// JWT minting — only runs when system context is present
		if (!systemKeyResolution) return;

		// deviceId is resolved by DeviceHook (@AfterHook '/sign-in/email'),
		// which runs before this hook in the registration order.
		const deviceId = ctx.context.deviceId as string | undefined;

		this.logSuccess(
			correlationId,
			ipHash,
			userAgent,
			ip,
			userId,
			systemKeyResolution.systemId,
			deviceId,
		);

		const session = (returned as Record<string, unknown> | undefined)
			?.session as Record<string, unknown> | undefined;
		const sessionId = typeof session?.id === 'string' ? session.id : '';

		const systemContext: SystemContext = {
			systemId: systemKeyResolution.systemId,
			organizationId: systemKeyResolution.organizationId,
			accessModel: systemKeyResolution.accessModel,
			apiBaseUrl: systemKeyResolution.apiBaseUrl,
		};

		const { role } = await this.resolveMembership(userId, systemContext);

		const jwk = await this.jwkRepo.getActiveKey();
		if (!jwk) return; // no signing key — skip JWT gracefully; don't break login

		const userEmail = typeof user?.email === 'string' ? user.email : '';
		const emailVerified =
			typeof user?.emailVerified === 'boolean' ? user.emailVerified : false;

		const token = await this.jwtMintService.mint(
			{
				sub: userId,
				email: userEmail,
				emailVerified,
				sid: sessionId,
				orgId: systemKeyResolution.organizationId,
				role,
				aud: systemKeyResolution.apiBaseUrl,
			},
			jwk,
		);

		(ctx.context.returned as Record<string, unknown>).jwt = token;

		void this.systemAuditLog
			.log({
				eventType: 'jwt_issued',
				systemId: systemKeyResolution.systemId,
				details: { userId, role, sessionId },
			})
			.catch(() => undefined);
	}

	// ── Private logging methods ─────────────────────────────────────────────────

	private logSuccess(
		correlationId: string,
		ipHash: string,
		userAgent: string,
		ip: string,
		userId: string,
		systemId: string,
		deviceId: string | undefined,
	): void {
		auditLogger.info({
			level: 'security',
			event: 'auth.login.success',
			userId,
			provider: 'email',
			ipHash,
			userAgent,
			correlationId,
			resultStatus: 'success',
		});
		recordAuthEvent('auth.login.success', { provider: 'email' });
		void this.auditLogService
			.logLoginAttempt({
				userId,
				systemId,
				loginMethod: 'email',
				ipAddress: ip,
				userAgent,
				deviceName: parseDeviceName(userAgent),
				correlationId,
				deviceId,
				success: true,
			})
			.catch(() => undefined);
	}

	private logFailure(
		correlationId: string,
		ipHash: string,
		userAgent: string,
		ip: string,
		errorType: SignInErrorType,
		systemId: string | undefined,
	): void {
		auditLogger.warn({
			level: 'security',
			event: 'auth.login.failure',
			error_type: errorType,
			provider: 'email',
			ipHash,
			userAgent,
			correlationId,
			resultStatus: 'failure',
		});
		recordAuthEvent('auth.login.failure', {
			provider: 'email',
			error_type: errorType,
		});
		void this.auditLogService
			.logLoginAttempt({
				userId: undefined,
				systemId,
				loginMethod: 'email',
				ipAddress: ip,
				userAgent,
				deviceName: parseDeviceName(userAgent),
				correlationId,
				deviceId: undefined,
				success: false,
				failureReason: errorType,
			})
			.catch(() => undefined);
	}

	// ── Private helpers ─────────────────────────────────────────────────────────

	private async resolveSystemKey(
		ctx: AuthHookContext,
	): Promise<SystemKeyResolution> {
		const key = extractSystemKey((name) => ctx.getHeader(name) ?? undefined);

		if (!key) throw new APIError(401, { error: 'missing_system_key' });

		const resolution = await this.systemKeyService.resolveSystemId(key);
		if (!resolution) throw new APIError(401, { error: 'invalid_system_key' });
		if (resolution.status === 'suspended')
			throw new APIError(401, { error: 'system_inactive' });

		return resolution;
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

	private async dispatchFailedLoginAlert(
		email: string,
		correlationId: string,
		ip: string,
		userAgent: string,
	): Promise<void> {
		try {
			const normalizedEmail = normalizeEmail(email);
			const user = await this.userRepo.findByNormalizedEmail(normalizedEmail);

			if (!user) {
				// User not found—log audit event and return
				void this.systemAuditLog
					.log({
						eventType: 'failed_login_alert_skipped_no_account',
						details: { correlationId },
					})
					.catch(() => undefined);
				return;
			}

			// User found—check 2FA status
			const twoFactorRecord = await this.twoFactorRepo.findEnabledByUserId(
				user.id,
			);
			const twoFactorSuggested = !twoFactorRecord;

			// Fire-and-forget email dispatch
			void this.emailService
				.sendFailedLoginAlertEmail(user.email.value, {
					twoFactorSuggested,
					twoFactorSettingsUrl: env.TWO_FACTOR_SETTINGS_URL,
					ipAddress: ip,
					userAgent,
					timestamp: new Date(),
				})
				.catch(() => undefined);

			// Fire-and-forget audit log write
			void this.systemAuditLog
				.log({
					eventType: 'failed_login_alert_sent',
					targetUserId: user.id,
					ipAddress: ip,
					userAgent,
					details: {
						two_factor_suggested: twoFactorSuggested,
						correlation_id: correlationId,
					},
				})
				.catch(() => undefined);
		} catch {
			// Silently catch any errors—alert dispatch must not block login
		}
	}
}
