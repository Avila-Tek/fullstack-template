import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveGcpSecrets } from '@zoom/config';
import dotenv from 'dotenv';
import { z } from 'zod';

const envCandidates = [
	resolve(process.cwd(), '.env'),
	resolve(process.cwd(), 'apps/auth/.env'),
	resolve(__dirname, '../.env'),
];

const authEnvSchema = z.looseObject({
	// Auth Service — own database (separate from apps/api DATABASE_URL)
	AUTH_DATABASE_URL: z.string().min(1),

	// Better Auth
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.string().default('http://localhost:3001'),
	BETTER_AUTH_API_KEY: z.string().optional(),

	// Public base URL of this auth service — used as the JWT "iss" (issuer) claim
	AUTH_BASE_URL: z.string().url(),

	// Verification email config
	VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().default(24),
	VERIFICATION_RESEND_MAX: z.coerce.number().default(3),

	// Session config
	SESSION_INACTIVITY_TIMEOUT_MINUTES: z.coerce.number().default(30),

	// Trusted origins for CORS (Angular SPAs) and orchestrator
	CLIENT_URL: z.string().default('http://localhost:4200'),
	ORCHESTRATOR_URL: z.string().default('http://localhost:3000'),

	// Social OAuth providers
	GOOGLE_CLIENT_ID: z.string().default(''),
	GOOGLE_CLIENT_SECRET: z.string().default(''),
	SOCIAL_AUTH_GOOGLE_ENABLED: z.stringbool().default(true),
	FACEBOOK_CLIENT_ID: z.string().default(''),
	FACEBOOK_CLIENT_SECRET: z.string().default(''),
	SOCIAL_AUTH_FACEBOOK_ENABLED: z.stringbool().default(true),

	// Brute-force login protection (per normalized email)
	BRUTE_FORCE_MAX_ATTEMPTS: z.coerce.number().default(5),
	BRUTE_FORCE_LOCK_WINDOW_SECONDS: z.coerce.number().default(900),

	// Rate limiting — sign-up (defaults: 5 attempts per 3600s window)
	SIGN_UP_RATE_LIMIT_MAX: z.coerce.number().default(5),
	SIGN_UP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(3600),

	// Rate limiting — social sign-in (defaults: 5 attempts per 600s window)
	SOCIAL_RATE_LIMIT_MAX: z.coerce.number().default(5),
	SOCIAL_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(600),

	// Password reset — token TTL and rate limits
	PASSWORD_RESET_TOKEN_TTL_SECONDS: z.coerce.number().default(3600),
	PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX: z.coerce.number().default(3),
	PASSWORD_RESET_EMAIL_RATE_LIMIT_WINDOW_SECONDS: z.coerce
		.number()
		.default(3600),
	PASSWORD_RESET_IP_RATE_LIMIT_MAX: z.coerce.number().default(10),
	PASSWORD_RESET_IP_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(3600),
	PASSWORD_HISTORY_DEPTH: z.coerce.number().default(5),

	// Password change — rate limits (defaults: 5 attempts per 600s window)
	CHANGE_PASSWORD_RATE_LIMIT_MAX: z.coerce.number().default(5),
	CHANGE_PASSWORD_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(600),

	// Email change — rate limits (defaults: 5 attempts per 300s window)
	CHANGE_EMAIL_RATE_LIMIT_MAX: z.coerce.number().default(5),
	CHANGE_EMAIL_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().default(300),

	// Pending terms store TTL in seconds (default: 600)
	PENDING_TERMS_TTL_SECONDS: z.coerce.number().default(600),

	// OAuth system context store TTL in seconds (default: 600 — must complete OAuth round-trip before expiry)
	OAUTH_SYSTEM_CTX_TTL_SECONDS: z.coerce.number().int().positive().default(600),

	// Captcha (Cloudflare Turnstile)
	SKIP_CAPTCHA: z.stringbool().default(false),
	TURNSTILE_SECRET_KEY: z.string().default(''),

	// Legacy Google reCAPTCHA keys (kept for reference; no longer used)
	RECAPTCHA_V2_SECRET_KEY: z.string().default(''),
	RECAPTCHA_V3_SECRET_KEY: z.string().default(''),

	// 256-bit hex key for AES-256-GCM PII column encryption (Drizzle encryptedText customType). Generate: openssl rand -hex 32
	PII_ENCRYPTION_KEY: z
		.string()
		.regex(
			/^[A-Fa-f0-9]{64}$/,
			'PII_ENCRYPTION_KEY must be a 64-character hexadecimal string (256 bits)',
		),

	// 2FA OTP delivery settings (S-005)
	OTP_TTL_SECONDS: z.coerce.number().default(300),
	OTP_MAX_SENDS: z.coerce.number().default(3),
	OTP_WINDOW_SECONDS: z.coerce.number().default(600),
	TOTP_ISSUER_NAME: z.string().default('Zoom'),

	// 2FA challenge configuration (S-007) — maximum failed attempts before lockout
	TOTP_MAX_FAILURES: z.coerce.number().default(3),
	OTP_MAX_ATTEMPTS: z.coerce.number().default(3),
	// TOTP replay prevention window: must cover ±1 period tolerance (30s * 2 = 60s minimum)
	TOTP_REPLAY_WINDOW_SECONDS: z.coerce.number().default(90),

	// 2FA settings page URL (S-014) — used in failed login alert email
	TWO_FACTOR_SETTINGS_URL: z.url().default(''),

	// Zoom API shared credentials (auth shared between SMS and email adapters)
	ZOOM_AUTH_URL: z.string().default(''),
	ZOOM_USER: z.string().default(''),
	ZOOM_PASSWORD: z.string().default(''),

	// Zoom SMS gateway (S-005)
	ZOOM_SMS_API_URL: z.string().default(''),
	ZOOM_SMS_SENDER_ID: z.string().default(''),

	// Zoom Email gateway
	ZOOM_EMAIL_API_URL: z.string().default(''),
	ZOOM_EMAIL_SENDER_ID: z.coerce.number().default(1),
	EMAIL_LOGO_URL: z
		.string()
		.url()
		.default('https://storage.googleapis.com/zoom-public-files/zoom-logo.png'),

	// Zoom API resilience — applies to all Zoom API fetch calls (auth, SMS, email)
	ZOOM_API_TIMEOUT_MS: z.coerce.number().default(10_000),
	ZOOM_API_RETRY_MAX: z.coerce.number().default(3),
	ZOOM_API_RETRY_BACKOFF_MS: z.coerce.number().default(200),

	// Admin API secret — used by POST /admin/users/:id/unlock (Authorization: Bearer <secret>)
	ADMIN_SECRET: z.string().min(1),

	// Internal service secret — used by POST /internal/users/provision (x-service-secret header)
	AUTH_SERVICE_SECRET: z.string().min(1),

	// HMAC-SHA256 secret for API key hashing — a stolen DB alone is not sufficient without this key
	API_KEY_HMAC_SECRET: z.string().min(1),

	// Server
	PORT: z.coerce.number().default(3001),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	LOG_LEVEL: z.string().default('info'),

	// Sentry error monitoring
	SENTRY_DSN: z.string().optional(),
	// Injected at CI build time: GIT_SHA=$(git rev-parse --short HEAD)
	GIT_SHA: z.string().optional(),
	SENTRY_AUTH_TOKEN: z.string().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),

	// Redis
	REDIS_URL: z.string().default('redis://localhost:6379'),
	// PEM-encoded CA cert for `rediss://` TLS verification (e.g. GCP Memorystore).
	// Leave unset for plain `redis://` connections.
	REDIS_CA_CERT: z.string().optional(),

	// Platform
	TERMS_CACHE_TTL_SECONDS: z.coerce.number().default(300),

	// Seed script (npm run db:seed)
	SEED_PLATFORM_ADMIN_EMAIL: z.string().optional(),
	SEED_PLATFORM_ADMIN_NAME: z.string().optional(),
	SEED_PLATFORM_ADMIN_PASSWORD: z.string().optional(),
	SEED_SYSTEMS: z.string().optional(),

	// Argon2id tuning (optional — defaults are secure)
	ARGON2_MEMORY_COST: z.coerce.number().default(65536),
	ARGON2_TIME_COST: z.coerce.number().default(3),
	ARGON2_PARALLELISM: z.coerce.number().default(4),

	// OpenTelemetry
	OTEL_SERVICE_NAME: z.string().optional(),
	OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4317'),

	// NestJS throttler (app.module.ts)
	RATE_TTL: z.coerce.number().default(60_000),
	RATE_LIMIT: z.coerce.number().default(100),

	// GCP Secret Manager integration (see packages/config)
	USE_GCP_SECRETS: z.stringbool().optional(),
	GCP_PROJECT_ID: z.string().optional(),
});

export type Env = z.infer<typeof authEnvSchema>;

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		dotenv.config({ path: envPath });
		break;
	}
}

// Populated synchronously at module load from dotenv + process.env so that
// module-scope `const X = env.Y` reads (e.g. in auth.ts, telemetry.ts) see
// sensible values. loadEnv() then upgrades any GCP Secret Manager locators
// in place before NestFactory.create consumes secrets via DI.
const envState = authEnvSchema.parse(process.env);
export const env = envState;

let loaded = false;

export async function loadEnv(): Promise<Env> {
	if (loaded) {
		return envState;
	}

	await resolveGcpSecrets(process.env, {
		enabled: process.env.USE_GCP_SECRETS === 'true',
		projectId: process.env.GCP_PROJECT_ID,
		concurrency: 5,
	});

	const parsed = authEnvSchema.parse(process.env);
	Object.assign(envState, parsed);
	loaded = true;
	return envState;
}
