// ---------------------------------------------------------------------------
// Global vitest setup for apps/auth
// ---------------------------------------------------------------------------
// Default env mock — prevents real dotenv + Zod parse from running.
// Tests that need specific env values can override with their own vi.mock.
// ---------------------------------------------------------------------------

import { vi } from 'vitest';
import type { Env } from '../src/env';

vi.mock(import('../src/env'), () => ({
	env: {
		// Database
		AUTH_DATABASE_URL: 'postgresql://test:test@localhost:5432/zoom_auth_test',

		// Better Auth
		BETTER_AUTH_SECRET: 'test-secret',
		BETTER_AUTH_URL: 'http://localhost:3001',
		BETTER_AUTH_API_KEY: undefined,

		// Auth base
		AUTH_BASE_URL: 'http://localhost:3001',

		// Email verification
		VERIFICATION_TOKEN_TTL_HOURS: 24,
		VERIFICATION_RESEND_MAX: 3,

		// Session
		SESSION_INACTIVITY_TIMEOUT_MINUTES: 30,

		// Trusted origins
		CLIENT_URL: 'http://localhost:4200',
		ORCHESTRATOR_URL: 'http://localhost:3000',

		// OAuth
		GOOGLE_CLIENT_ID: '',
		GOOGLE_CLIENT_SECRET: '',
		SOCIAL_AUTH_GOOGLE_ENABLED: true,
		FACEBOOK_CLIENT_ID: '',
		FACEBOOK_CLIENT_SECRET: '',
		SOCIAL_AUTH_FACEBOOK_ENABLED: true,

		// Brute force
		BRUTE_FORCE_MAX_ATTEMPTS: 5,
		BRUTE_FORCE_LOCK_WINDOW_SECONDS: 900,

		// Rate limiting — sign-up
		SIGN_UP_RATE_LIMIT_MAX: 5,
		SIGN_UP_RATE_LIMIT_WINDOW_SECONDS: 3600,

		// Rate limiting — social
		SOCIAL_RATE_LIMIT_MAX: 5,
		SOCIAL_RATE_LIMIT_WINDOW_SECONDS: 600,

		// Password reset
		PASSWORD_RESET_TOKEN_TTL_SECONDS: 3600,
		PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX: 3,
		PASSWORD_RESET_EMAIL_RATE_LIMIT_WINDOW_SECONDS: 3600,
		PASSWORD_RESET_IP_RATE_LIMIT_MAX: 10,
		PASSWORD_RESET_IP_RATE_LIMIT_WINDOW_SECONDS: 3600,
		PASSWORD_HISTORY_DEPTH: 5,

		// Password change
		CHANGE_PASSWORD_RATE_LIMIT_MAX: 5,
		CHANGE_PASSWORD_RATE_LIMIT_WINDOW_SECONDS: 600,

		// Email change
		CHANGE_EMAIL_RATE_LIMIT_MAX: 5,
		CHANGE_EMAIL_RATE_LIMIT_WINDOW_SECONDS: 300,

		// Pending terms
		PENDING_TERMS_TTL_SECONDS: 600,

		// OAuth system context
		OAUTH_SYSTEM_CTX_TTL_SECONDS: 600,

		// Captcha
		SKIP_CAPTCHA: false,
		TURNSTILE_SECRET_KEY: '',

		// Legacy reCAPTCHA
		RECAPTCHA_V2_SECRET_KEY: '',
		RECAPTCHA_V3_SECRET_KEY: '',

		// 2FA OTP
		OTP_TTL_SECONDS: 300,
		OTP_MAX_SENDS: 3,
		OTP_WINDOW_SECONDS: 600,
		TOTP_ISSUER_NAME: 'Zoom',

		// 2FA challenge
		TOTP_MAX_FAILURES: 3,
		OTP_MAX_ATTEMPTS: 3,
		TOTP_REPLAY_WINDOW_SECONDS: 90,

		// 2FA settings
		TWO_FACTOR_SETTINGS_URL: '',

		// Zoom API
		ZOOM_AUTH_URL: '',
		ZOOM_USER: '',
		ZOOM_PASSWORD: '',

		// Zoom SMS
		ZOOM_SMS_API_URL: '',
		ZOOM_SMS_SENDER_ID: '',

		// Zoom Email
		ZOOM_EMAIL_API_URL: '',
		ZOOM_EMAIL_SENDER_ID: 2,

		// Zoom API resilience
		ZOOM_API_TIMEOUT_MS: 10_000,
		ZOOM_API_RETRY_MAX: 3,
		ZOOM_API_RETRY_BACKOFF_MS: 200,

		// Admin API
		ADMIN_SECRET: 'test-admin-secret',

		// Internal service
		AUTH_SERVICE_SECRET: 'test-service-secret',

		// API key HMAC
		API_KEY_HMAC_SECRET: 'test-hmac-secret',

		// Server
		PORT: 3001,
		NODE_ENV: 'test',
		LOG_LEVEL: 'error',

		// Sentry
		SENTRY_DSN: undefined,
		GIT_SHA: undefined,
		SENTRY_AUTH_TOKEN: undefined,
		SENTRY_ORG: undefined,
		SENTRY_PROJECT: undefined,

		// Redis
		REDIS_URL: 'redis://localhost:6379',
		REDIS_CA_CERT: undefined,

		// Platform
		TERMS_CACHE_TTL_SECONDS: 300,

		// Seed
		SEED_PLATFORM_ADMIN_EMAIL: undefined,
		SEED_PLATFORM_ADMIN_NAME: undefined,
		SEED_PLATFORM_ADMIN_PASSWORD: undefined,
		SEED_SYSTEMS: undefined,

		// Argon2id
		ARGON2_MEMORY_COST: 65536,
		ARGON2_TIME_COST: 3,
		ARGON2_PARALLELISM: 4,

		// OpenTelemetry
		OTEL_SERVICE_NAME: undefined,
		OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',

		// NestJS throttler
		RATE_TTL: 60_000,
		RATE_LIMIT: 100,

		// PII encryption
		PII_ENCRYPTION_KEY: 'test-pii-key-32-bytes-hex-padding',

		// GCP
		USE_GCP_SECRETS: undefined,
		GCP_PROJECT_ID: undefined,
	} satisfies Env,
	loadEnv: vi.fn(),
}));
