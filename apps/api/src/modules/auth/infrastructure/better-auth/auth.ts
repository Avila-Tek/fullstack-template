import { createHmac } from 'node:crypto';
import { dash } from '@better-auth/infra';
import { redisStorage } from '@better-auth/redis-storage';
import { redisTlsOptions } from '@zoom/config';
import { normalizeEmail } from '@zoom/utils';
import * as argon2 from 'argon2';
import { APIError, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getOAuthState } from 'better-auth/api';
import { jwt, organization, phoneNumber, twoFactor } from 'better-auth/plugins';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { AuditLogServicePort } from '../../application/ports/out/audit-log-service.port';
import type { EmailServicePort } from '../../application/ports/out/email-service.port';
import type { OAuthSystemContextStorePort } from '../../application/ports/out/oauth-system-context-store.port';
import { PasswordResetAuditLogPort } from '../../application/ports/out/password-reset-audit-log.port';
import type {
	SystemAuditEventParams,
	SystemAuditLogPort,
} from '../../application/ports/out/system-audit-log.port';
import type { SystemKeyResolution } from '../../application/ports/out/system-key-service.port';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { sha256Hex } from '../../shared/utils/sha256-hex';
import { validatePasswordComplexity } from '../../shared/utils/validate-password-complexity';
import * as schema from '../database/db-schema';
import { DrizzlePasswordResetAuditLogAdapter } from '../database/repositories/drizzle-password-reset-audit-log.adapter';
import { zoomEmailService } from '../email/zoom-email.adapter';
import { twoFactorFilter } from './two-factor-filter.plugin';
import { twoFactorSkip } from './two-factor-skip.plugin';

// Dedicated connection pool for Better Auth — separate from the NestJS DrizzleModule pool.
// Better Auth owns lifecycle of this connection; it must be available before the
// NestJS DI container starts, which is why we cannot inject it from DrizzleModule here.
const pool = new Pool({ connectionString: env.AUTH_DATABASE_URL });
const db = drizzle(pool, { schema });
const redis = new Redis(env.REDIS_URL, {
	maxRetriesPerRequest: 1,
	enableOfflineQueue: false,
	...redisTlsOptions(env.REDIS_CA_CERT),
});

const ARGON2_MEMORY_COST = env.ARGON2_MEMORY_COST;
const ARGON2_TIME_COST = env.ARGON2_TIME_COST;
const ARGON2_PARALLELISM = env.ARGON2_PARALLELISM;

const SIGN_UP_RATE_LIMIT_MAX = env.SIGN_UP_RATE_LIMIT_MAX;
const SIGN_UP_RATE_LIMIT_WINDOW_SECONDS = env.SIGN_UP_RATE_LIMIT_WINDOW_SECONDS;

const SOCIAL_RATE_LIMIT_MAX = env.SOCIAL_RATE_LIMIT_MAX;
const SOCIAL_RATE_LIMIT_WINDOW_SECONDS = env.SOCIAL_RATE_LIMIT_WINDOW_SECONDS;

const TRUSTED_SOCIAL_PROVIDERS = ['google', 'facebook'] as const;

const VERIFICATION_RESEND_RATE_LIMIT_COUNT = env.VERIFICATION_RESEND_MAX;
const VERIFICATION_RESEND_RATE_LIMIT_WINDOW = 3600;

// Module-scope adapter — used by sendResetPassword callback (runs outside NestJS DI).
// Follows the same static-import pattern as smtpEmailService.
const passwordResetAuditLogService: PasswordResetAuditLogPort =
	new DrizzlePasswordResetAuditLogAdapter(db, auditLogger);

// Spec §18: store password hash in history and prune to the 5 most recent entries.
// Called from account.create.after (sign-up) and account.update.after (password reset/change).
async function appendPasswordHistory(
	userId: string,
	hashedPassword: string,
): Promise<void> {
	await db.insert(schema.passwordHistory).values({
		id: crypto.randomUUID(),
		userId,
		hashedPassword,
	});

	const history = await db
		.select({ id: schema.passwordHistory.id })
		.from(schema.passwordHistory)
		.where(eq(schema.passwordHistory.userId, userId))
		.orderBy(desc(schema.passwordHistory.createdAt));

	if (history.length > env.PASSWORD_HISTORY_DEPTH) {
		const idsToDelete = history
			.slice(env.PASSWORD_HISTORY_DEPTH)
			.map((r) => r.id);
		await db
			.delete(schema.passwordHistory)
			.where(inArray(schema.passwordHistory.id, idsToDelete));
	}
}

export async function handleSendVerificationEmail(
	email: string,
	url: string,
	deps: {
		emailService: Pick<EmailServicePort, 'sendVerificationEmail'>;
		logger: typeof auditLogger;
	},
): Promise<void> {
	try {
		await deps.emailService.sendVerificationEmail(email, url);
		const emailHash = sha256Hex(normalizeEmail(email));
		deps.logger.info(
			{ level: 'security', event: 'verification_email_sent', emailHash },
			'Verification email sent',
		);
		recordAuthEvent('verification_email_sent');
	} catch (err) {
		const emailHash = sha256Hex(normalizeEmail(email));
		deps.logger.error(
			{
				level: 'security',
				event: 'verification_email_send_failed',
				emailHash,
				err,
			},
			'Verification email send failed',
		);
		recordAuthEvent('verification_email_send_failed');
	}
}

export function handleSendResetPasswordEmail(
	email: string,
	url: string,
	deps: {
		emailService: Pick<EmailServicePort, 'sendPasswordResetEmail'>;
		logger: typeof auditLogger;
		auditLog: PasswordResetAuditLogPort;
	},
): void {
	const emailHash = sha256Hex(normalizeEmail(email));
	deps.emailService
		.sendPasswordResetEmail(email, url)
		.then(() => {
			deps.logger.info(
				{ level: 'security', event: 'password_reset_email_sent', emailHash },
				'Password reset email sent',
			);
			recordAuthEvent('password_reset_email_sent');
			void deps.auditLog.log({
				eventType: 'password_reset_email_sent',
				details: { emailHash },
			});
		})
		.catch((err: unknown) => {
			deps.logger.error(
				{
					level: 'security',
					event: 'password_reset_email_send_failed',
					emailHash,
					err,
				},
				'Password reset email send failed',
			);
			recordAuthEvent('password_reset_email_send_failed');
			void deps.auditLog.log({
				eventType: 'password_reset_email_send_failed',
				details: {
					emailHash,
					error: err instanceof Error ? err.message : String(err),
				},
			});
		});
}

export async function handleAfterEmailVerification(
	user: { id: string; email: string },
	deps: {
		emailService: Pick<EmailServicePort, 'sendWelcomeEmail'>;
		logger: typeof auditLogger;
	},
): Promise<void> {
	deps.emailService.sendWelcomeEmail(user.email).catch((err: unknown) => {
		deps.logger.error(
			{
				level: 'security',
				event: 'welcome_email_send_failed',
				userId: user.id,
				err,
			},
			'Welcome email send failed',
		);
	});
}

export const auth = betterAuth({
	// Better Auth reads BETTER_AUTH_URL + BETTER_AUTH_SECRET from env automatically,
	// but explicit declaration makes the dependency visible.
	baseURL: env.BETTER_AUTH_URL,
	basePath: '/api/v1/auth',
	secret: env.BETTER_AUTH_SECRET,

	database: drizzleAdapter(db, {
		provider: 'pg',
		// usePlural: false (default) — our tables are named user/session/account/verification
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
			twoFactor: schema.twoFactor,
			rateLimit: schema.rateLimit,
			jwks: schema.jwks,
			// Organization plugin tables (S-010)
			organization: schema.organization,
			member: schema.member,
			invitation: schema.invitation,
		},
	}),

	// Declare custom user columns so Better Auth includes them in session/user responses
	// and makes them available in hooks. Values come from our Drizzle schema.
	user: {
		fields: {
			name: 'fullName',
		},
		additionalFields: {
			normalizedEmail: {
				type: 'string',
				// Computed server-side in hooks; clients cannot set it directly
				input: false,
			},
			twoFactorEnabled: {
				type: 'boolean',
				required: true,
				defaultValue: false,
				input: false,
			},
			// S-010: exposed in session so PlatformAdminGuard can check without a DB roundtrip
			platformAdmin: {
				type: 'boolean',
				required: true,
				defaultValue: false,
				input: false,
			},
		},
		changeEmail: { enabled: true },
	},

	emailAndPassword: {
		enabled: true,
		// Blocks login until the email verification token is consumed (spec §6)
		requireEmailVerification: true,
		// Replace the default Scrypt hasher with Argon2id (spec §18)
		password: {
			hash: async (password: string): Promise<string> => {
				// Complexity check applies to sign-up, reset, and any change flow.
				const { valid, errors } = validatePasswordComplexity(password);
				if (!valid) throw new Error(errors[0]);
				// NOTE §18 — Password HISTORY check (reject last 5 reused passwords) cannot be
				// performed here: `password.hash` receives only the raw password with no userId
				// context. History checking requires both the raw password (to run argon2.verify
				// against stored hashes) and the userId. This is implemented in Phase 10's
				// custom POST /auth/change-password endpoint where both are available.
				// Storage of history hashes is handled in account.create.after / account.update.after.
				return argon2.hash(password, {
					type: argon2.argon2id,
					memoryCost: ARGON2_MEMORY_COST,
					timeCost: ARGON2_TIME_COST,
					parallelism: ARGON2_PARALLELISM,
				});
			},
			verify: ({
				hash,
				password,
			}: {
				hash: string;
				password: string;
			}): Promise<boolean> => argon2.verify(hash, password),
		},
		// Spec §18 / spec §6: send password-reset email via SMTP (fire-and-forget)
		sendResetPassword: async ({
			user,
			url,
		}: {
			user: { email: string };
			url: string;
		}) => {
			handleSendResetPasswordEmail(user.email, url, {
				emailService: zoomEmailService,
				logger: auditLogger,
				auditLog: passwordResetAuditLogService,
			});
		},
		// S-008: token TTL for /request-password-reset links (default 1 hour)
		resetPasswordTokenExpiresIn: env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
	},

	// Angular SPA origins allowed to make auth requests (spec §16)
	trustedOrigins: [env.CLIENT_URL, env.ORCHESTRATOR_URL],

	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			enabled: env.SOCIAL_AUTH_GOOGLE_ENABLED,
		},
		facebook: {
			clientId: env.FACEBOOK_CLIENT_ID,
			clientSecret: env.FACEBOOK_CLIENT_SECRET,
			enabled: env.SOCIAL_AUTH_FACEBOOK_ENABLED,
		},
	},

	// Spec §16: auto-link social account if provider email matches existing normalized_email
	account: {
		accountLinking: {
			enabled: true,
			// Google and Facebook are trusted: email is always verified by the provider
			trustedProviders: [...TRUSTED_SOCIAL_PROVIDERS],
		},
	},

	// Built-in sliding-window rate limiter — enabled in all environments for auth endpoints
	// Relies on x-forwarded-for header for IP matching
	rateLimit: {
		enabled: true,
		// Use secondary storage (Redis)
		storage: 'secondary-storage',
		// 10 requests per 60-second window per IP (applies to auth routes)
		window: 60,
		max: 10,
		customRules: {
			// 5 requests per hour window per IP (applies to email sign-up)
			'/sign-up/email': {
				max: SIGN_UP_RATE_LIMIT_MAX,
				window: SIGN_UP_RATE_LIMIT_WINDOW_SECONDS,
			},
			// 5 requests per 10-minute window per IP (applies to social sign-in)
			'/sign-in/social': {
				max: SOCIAL_RATE_LIMIT_MAX,
				window: SOCIAL_RATE_LIMIT_WINDOW_SECONDS,
			},
			// 3 requests per hour window per IP (applies to verification email resend)
			'/send-verification-email': {
				max: VERIFICATION_RESEND_RATE_LIMIT_COUNT,
				window: VERIFICATION_RESEND_RATE_LIMIT_WINDOW,
			},
			// per-IP rate limit for password reset initiation and completion
			'/request-password-reset': {
				max: env.PASSWORD_RESET_IP_RATE_LIMIT_MAX,
				window: env.PASSWORD_RESET_IP_RATE_LIMIT_WINDOW_SECONDS,
			},
			'/reset-password': {
				max: env.PASSWORD_RESET_IP_RATE_LIMIT_MAX,
				window: env.PASSWORD_RESET_IP_RATE_LIMIT_WINDOW_SECONDS,
			},
			'/change-password': {
				max: env.CHANGE_PASSWORD_RATE_LIMIT_MAX,
				window: env.CHANGE_PASSWORD_RATE_LIMIT_WINDOW_SECONDS,
			},
			'/change-email': {
				max: env.CHANGE_EMAIL_RATE_LIMIT_MAX,
				window: env.CHANGE_EMAIL_RATE_LIMIT_WINDOW_SECONDS,
			},
		},
	},
	// Register secondary storage (Redis) for rate limit
	secondaryStorage: redisStorage({
		client: redis,
	}),

	// Spec §15: ES256 JWT access tokens (15 min) + JWKS endpoint for offline validation
	plugins: [
		// Better Auth Infrastructure dashboard — reports analytics/audit events to the
		// hosted dashboard. Plugin no-ops gracefully when BETTER_AUTH_API_KEY is unset
		// (local dev) and is fully active per environment when the key is provided.
		dash({ apiKey: env.BETTER_AUTH_API_KEY }),
		// S-010: multi-tenant organization support — each registered system maps to one org
		organization(),
		jwt({
			jwks: {
				// ES256 — EC key pair auto-generated and stored in the `jwks` table
				keyPairConfig: { alg: 'ES256' },
				// Served at /api/v1/auth/.well-known/jwks.json
				jwksPath: '/.well-known/jwks.json',
			},
			jwt: {
				issuer: env.BETTER_AUTH_URL,
				audience: [env.ORCHESTRATOR_URL],
				// Spec §15: 15-minute access token lifetime
				expirationTime: '15 minutes',
				// Suppress BA's generic set-auth-jwt header on /get-session responses.
				// That header carries a base JWT without system claims; clients must
				// call /token explicitly to get a system-scoped ES256 JWT.
				disableSettingJwtHeader: true,
				// Spec §15: include standard claims; sub (user id) is set automatically
				definePayload: ({ user, session }) => ({
					email: user.email,
					emailVerified: user.emailVerified,
					sid: session.id,
					// Scope is empty for v1; Phase 11 will populate this from the business API
					scope: '',
				}),
			},
		}),
		// S-005: phone number registration + verification plugin.
		// Adds phoneNumber + phoneNumberVerified columns to the user table.
		// Used in the 2FA onboarding flow — user must verify their phone before
		// choosing SMS as a 2FA method. Phone verification OTPs are sent via Zoom SMS.
		phoneNumber({
			sendOTP: async ({ phoneNumber: to, code }, ctx) => {
				type Sender = (phone: string, otp: string) => Promise<void>;
				const sendPhoneOTP = ctx?.context?.sendPhoneOTP as Sender | undefined;

				if (typeof sendPhoneOTP !== 'function') {
					auditLogger.error(
						{ event: 'phone_number.send_otp.missing_hook' },
						'sendOTP called without injected handler — PhoneNumberSendOtpHook did not run',
					);
					throw new APIError(500, { error: 'otp_handler_not_configured' });
				}

				await sendPhoneOTP(to, code);
			},
			// Venezuelan local format: 04XX-NNNNNNN (11 digits, starts with 04)
			phoneNumberValidator: async (phone) => /^04\d{9}$/.test(phone),
			otpLength: 6,
			expiresIn: env.OTP_TTL_SECONDS,
		}),
		// Spec §8 / S-005: 2FA via TOTP app, email OTP, or SMS OTP.
		// Optional to enable; mandatory once enabled. Better Auth blocks sign-in with a
		// 2FA challenge for all methods when twoFactorEnabled = true.
		twoFactor({
			issuer: env.TOTP_ISSUER_NAME,
			// S-005: allow OTP-based enrollment without a TOTP app pre-configured
			allowPasswordless: true,
			skipVerificationOnEnable: false,
			otpOptions: {
				period: env.OTP_TTL_SECONDS,
				digits: 6,
				storeOTP: 'hashed',
				allowedAttempts: env.OTP_MAX_ATTEMPTS,
				sendOTP: async ({ user, otp }, ctx) => {
					type Sender = (dest: string, otp: string) => Promise<void>;
					const method =
						(ctx?.context?.otpMethod as string | undefined) ?? 'email';
					const sendEmailOTP = ctx?.context?.sendEmailOTP as Sender | undefined;
					const sendPhoneOTP = ctx?.context?.sendPhoneOTP as Sender | undefined;

					if (
						typeof sendEmailOTP !== 'function' ||
						typeof sendPhoneOTP !== 'function'
					) {
						auditLogger.error(
							{ userId: user.id, event: '2fa.send_otp.missing_hook' },
							'sendOTP called without injected handlers — TwoFactorSendOtpHook did not run',
						);
						// Throw instead of silently returning: a missing hook means the OTP
						// would never be delivered, but the caller would receive a 200.
						throw new APIError(500, { error: 'otp_handler_not_configured' });
					}

					const userWithPhone = user as typeof user & {
						phoneNumber?: string | null;
						phoneNumberVerified?: boolean | null;
					};

					if (method === 'sms') {
						const enrollmentPhone = ctx?.context?.enrollmentPhoneNumber as
							| string
							| undefined;

						const verifiedPhone =
							userWithPhone.phoneNumberVerified && userWithPhone.phoneNumber
								? userWithPhone.phoneNumber
								: undefined;

						// Enrollment: use the validated number from the request body.
						// Challenge: use the verified number on the user record.
						const phone = enrollmentPhone ?? verifiedPhone;

						if (!phone) {
							throw new APIError(422, {
								error: 'phone_not_verified',
							});
						}
						await sendPhoneOTP(phone, otp);
					} else {
						if (!user.emailVerified) {
							throw new APIError(403, {
								error: 'email_not_verified',
							});
						}
						await sendEmailOTP(user.email, otp);
					}
				},
			},
			backupCodeOptions: {
				amount: 8,
				length: 10,
			},
		}),
		// Filters twoFactorMethods to the single active method after twoFactor() sets it
		twoFactorFilter(db),
		// Custom no-op endpoint for 2FA skip — audit logging runs in TwoFactorSkipHook
		twoFactorSkip(),
	],

	// Spec §15: refresh token (session) — 7-day HttpOnly Secure SameSite=Strict cookie
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
		// Slide the expiry window: refresh the cookie if more than 1 day has elapsed
		updateAge: 60 * 60 * 24,
		cookieCache: {
			// Cache session in a short-lived cookie to reduce DB reads on every request
			enabled: true,
			maxAge: 60 * 5, // 5-minute client-side cache
		},
		storeSessionInDatabase: true,
	},

	advanced: {
		database: {
			// Generate UUID ids without changing column type
			generateId: () => crypto.randomUUID(),
		},
		// Enforce Secure flag in production; dev runs over http
		useSecureCookies: env.NODE_ENV === 'production',
	},

	// --- Email verification lifecycle ---

	emailVerification: {
		// Spec §6: token TTL — defaults to 24 h, overridable via env var
		expiresIn: env.VERIFICATION_TOKEN_TTL_HOURS * 60 * 60,
		// Redirect to Angular verify-email page after server-side token verification.
		// ?verified=1 marker tells the client this is a post-verification landing;
		// Better Auth redirects without appending the token, so the marker is the
		// only way for the frontend to distinguish a verification redirect from a
		// direct URL visit.
		// CLIENT_URL is guaranteed present by assertEnv() at startup.
		callbackURL: `${env.CLIENT_URL}/auth/verify-email?verified=1`,
		// Spec §6: sign the user in immediately after verification succeeds
		autoSignInAfterVerification: true,
		// Spec §6: send verification email via SMTP after registration.
		// The URL BA generates uses `baseURL` (= apps/auth's own URL), but the
		// user must hit the orchestrator instead — apps/auth is internal and
		// the orchestrator is the public gateway. Rewriting also lets the
		// change-email confirmation flow (E-003_S-005) traverse the auth-proxy
		// interceptor that triggers `business_profile.email` sync to apps/api.
		// Both env vars are set per environment, so this is deploy-agnostic.
		sendVerificationEmail: async ({
			user,
			url,
		}: {
			user: { email: string };
			url: string;
		}) => {
			const parsedUrl = new URL(url);
			const betterAuthOrigin = new URL(env.BETTER_AUTH_URL).origin;
			const orchestratorOrigin = new URL(env.ORCHESTRATOR_URL).origin;
			const publicUrl =
				parsedUrl.origin === betterAuthOrigin
					? new URL(
							`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
							orchestratorOrigin,
						).href
					: url;
			if (env.NODE_ENV === 'development') {
				const domain = (() => {
					try {
						return new URL(publicUrl).hostname;
					} catch {
						return 'unknown';
					}
				})();
				auditLogger.debug({ domain }, '[DEV] Verification link generated');
			}

			void handleSendVerificationEmail(user.email, publicUrl, {
				emailService: zoomEmailService,
				logger: auditLogger,
			});
		},
		// Spec §6: fire welcome email after verification; BetterAuth sets emailVerified
		afterEmailVerification: async (user: { id: string; email: string }) => {
			await handleAfterEmailVerification(user, {
				emailService: zoomEmailService,
				logger: auditLogger,
			});
		},
		sendOnSignUp: true,
	},

	// --- HTTP lifecycle hooks ---
	// Hook classes (SignUpHook, SignInHook, GoogleOAuthHook) are registered as
	// NestJS providers and wired via @Hook() / @BeforeHook() / @AfterHook()
	// decorators from @thallesp/nestjs-better-auth. The empty object is required
	// for the decorator mechanism to activate.
	hooks: {},

	// --- DB lifecycle hooks ---

	databaseHooks: {
		user: {
			create: {
				// Spec §3, §6: compute normalizedEmail before the row is inserted.
				// Duplicate-email enforcement is done in @BeforeHook('/sign-up/email');
				// the unique index on normalized_email is the final DB-level safety net.
				before: async (user) => ({
					data: {
						...user,
						normalizedEmail: normalizeEmail(user.email),
						twoFactorEnabled: false,
					},
				}),

				// Pass the auto-generated userId into ctx so the @AfterHook('/sign-up/email')
				// handler in SignUpHook can write the user_terms_acceptance row without an
				// extra DB round-trip. For OAuth flows this value is ignored.
				after: async (user, ctx) => {
					if (ctx?.context) ctx.context.createdUserId = user.id;
				},
			},

			// S-005: recompute normalizedEmail when BA's change-email verify flow updates email.
			update: {
				before: async (data) => {
					if (data.email) {
						return {
							data: { ...data, normalizedEmail: normalizeEmail(data.email) },
						};
					}
					return { data };
				},
			},
		},

		session: {
			create: {
				// Single-session enforcement per (userId, organizationId).
				// SignInHook.before (email path) pre-populates ctx.context.systemResolution.
				// OAuth path: SocialCallbackHook.before injects oauthSystemCtxStore; we
				// resolve systemResolution lazily here via getOAuthState() (available after
				// parseState() runs inside the callback handler).
				before: async (session, ctx) => {
					let resolution = ctx?.context?.systemResolution as
						| SystemKeyResolution
						| undefined;

					// OAuth path — resolve from Redis store via correlationId in OAuth state
					if (!resolution) {
						const store = ctx?.context?.oauthSystemCtxStore as
							| OAuthSystemContextStorePort
							| undefined;
						if (store) {
							const state = await getOAuthState();
							const correlationId =
								typeof state?.correlationId === 'string'
									? state.correlationId
									: undefined;
							if (correlationId) {
								const systemCtx = await store.get(correlationId);
								if (systemCtx) {
									// Cache on context so AfterHook and other hooks can reuse it
									if (ctx) ctx.context.systemResolution = systemCtx;
									resolution = systemCtx as SystemKeyResolution;
								}
							}
						}
					}

					let orgId: string | undefined = resolution?.organizationId;
					let systemId: string | undefined = resolution?.systemId;

					// Fallback: paths that don't pre-populate systemResolution (e.g.
					// /two-factor/verify-totp) resolve the org directly from the request header.
					if (!orgId) {
						const rawKey =
							ctx?.request?.headers?.get?.('x-system-key')?.trim() ?? '';
						if (rawKey) {
							const hash = createHmac('sha256', env.API_KEY_HMAC_SECRET)
								.update(rawKey)
								.digest('hex');
							const [row] = await db
								.select({
									organizationId: schema.system.organizationId,
									systemId: schema.system.id,
								})
								.from(schema.systemApiKey)
								.innerJoin(
									schema.system,
									eq(schema.systemApiKey.systemId, schema.system.id),
								)
								.where(
									and(
										eq(schema.systemApiKey.keyHash, hash),
										isNull(schema.systemApiKey.revokedAt),
									),
								)
								.limit(1);
							orgId = row?.organizationId;
							systemId = row?.systemId;
						}
					}

					if (!orgId || !session.userId) return;

					const revoked = await db
						.delete(schema.session)
						.where(
							and(
								eq(schema.session.userId, session.userId),
								eq(schema.session.activeOrganizationId, orgId),
							),
						)
						.returning({ id: schema.session.id });

					if (revoked.length > 0) {
						// Clean up inactivity keys for sessions revoked by single-session
						// enforcement. These sessions are deleted via Drizzle directly, so the
						// @BeforeHook('/sign-out') never fires for them — we must clean up here.
						void Promise.all(
							revoked.map((r) => redis.del(`session:${r.id}:activity`)),
						).catch(() => undefined);

						const auditLog = ctx?.context?.systemAuditLog as
							| SystemAuditLogPort
							| undefined;
						const params: SystemAuditEventParams = {
							eventType: 'session_revoked_new_login',
							systemId: systemId,
							details: {
								revokedSessionIds: revoked.map((r) => r.id),
								userId: session.userId,
								organizationId: orgId,
							},
						};
						void auditLog?.log(params).catch(() => undefined);
					}

					return {
						data: { ...session, activeOrganizationId: orgId },
					};
				},

				// Device fingerprint tracking and login-alert email are handled by
				// DeviceHook (@AfterHook '/sign-in/email' and '/callback/:provider'),
				// which runs before SignInHook and SocialCallbackHook after-hooks.
				// DeviceHook stores deviceId in ctx.context.deviceId for audit logs.
				// Spec §12: record device fingerprint + write audit log after successful sign-in.
				after: async (session) => {
					// Seed Redis inactivity key so the orchestrator middleware can
					// enforce the inactivity timeout from the very first request.
					const timeoutSeconds = env.SESSION_INACTIVITY_TIMEOUT_MINUTES * 60;
					await redis.set(
						`session:${session.id}:activity`,
						'1',
						'EX',
						timeoutSeconds,
					);
				},
			},
		},

		// Spec §18: maintain password history for email/password accounts.
		// 'credential' is Better Auth's providerId for email+password sign-ups.
		account: {
			create: {
				// Spec AC-3 / Task 6.3: deny auto-linking when the platform user is
				// unverified AND the incoming account is for a different provider.
				// This prevents a partially-verified social account from linking to an
				// existing but unverified platform account.
				// NOTE: BetterAuth does not expose provider-reported emailVerified on the
				// account row in databaseHooks. The guard below uses the platform user's
				// emailVerified field — if the user already exists and is verified,
				// linking is always allowed (BetterAuth handles mismatched emails via its
				// own accountLinking checks). If the platform user is NOT verified and we
				// are trying to create a second provider link, we deny until verification
				// is complete.
				before: async (account, ctx) => {
					// Only apply the guard to social providers (not credential)
					if (
						!TRUSTED_SOCIAL_PROVIDERS.includes(
							account.providerId as 'google' | 'facebook',
						)
					)
						return;
					if (!account.userId) return;

					// Fetch the platform user's verified status
					const [userRow] = await db
						.select({ emailVerified: schema.user.emailVerified })
						.from(schema.user)
						.where(eq(schema.user.id, account.userId))
						.limit(1);

					// User not found or already verified — allow
					if (!userRow || userRow.emailVerified) return;

					// User exists and is unverified — check if they already have a
					// credential account (email+password). If so, deny the social link
					// to prevent bypassing the verification requirement.
					const existingCredential = await db
						.select({ id: schema.account.id })
						.from(schema.account)
						.where(
							and(
								eq(schema.account.userId, account.userId),
								eq(schema.account.providerId, 'credential'),
							),
						)
						.limit(1);

					if (existingCredential.length === 0) return; // no credential account — allow social-only signup

					const auditLogService =
						ctx?.context?.auditLogService instanceof AuditLogServicePort
							? ctx.context.auditLogService
							: undefined;
					auditLogService?.logSocialAuthEvent({
						correlationId:
							(ctx?.context?.correlationId as string) ?? crypto.randomUUID(),
						eventType: 'social_signup_unverified_email_rejected',
						providerId: account.providerId,
						ipHash: '',
						userAgent: '',
						failureReason: 'unverified_provider_email',
					});

					return false; // deny social link until credential email is verified
				},
				after: async (account) => {
					if (account.providerId === 'credential' && account.password) {
						await appendPasswordHistory(account.userId, account.password);
					}

					if (
						TRUSTED_SOCIAL_PROVIDERS.includes(
							account.providerId as 'google' | 'facebook',
						)
					) {
						// Spec §7: back-fill providerEmail from the user row, plus its
						// normalized form for email-based account lookups (e.g. the
						// change-email social-account disconnection flow).
						// account.create.before cannot inject custom columns reliably —
						// Better Auth doesn't merge the returned data for account rows
						// the same way it does for user rows. UPDATE after insertion instead.
						const [userRow] = await db
							.select({ email: schema.user.email })
							.from(schema.user)
							.where(eq(schema.user.id, account.userId))
							.limit(1);

						if (userRow) {
							await db
								.update(schema.account)
								.set({
									providerEmail: userRow.email,
									normalizedProviderEmail: normalizeEmail(userRow.email),
								})
								.where(eq(schema.account.id, account.id));
						}
						// NOTE (GAP-2): emailVerified is NOT set to true here.
						// New social users must start unverified and follow the email
						// verification flow (spec AC-3). BetterAuth will send a verification
						// email via emailVerification.sendVerificationEmail.
					}
				},
			},
			update: {
				// Fires on password reset and future change-password flows
				after: async (account) => {
					if (account.providerId !== 'credential' || !account.password) return;
					await appendPasswordHistory(account.userId, account.password);
				},
			},
		},
	},
});

export type AppAuth = typeof auth;
