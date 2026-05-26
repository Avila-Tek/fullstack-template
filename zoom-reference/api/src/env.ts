import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveGcpSecrets } from '@zoom/config';
import dotenv from 'dotenv';
import { z } from 'zod';

const envCandidates = [
	resolve(process.cwd(), '.env'),
	resolve(process.cwd(), 'apps/api/.env'),
	resolve(__dirname, '../.env'),
];

const apiEnvSchema = z.looseObject({
	// Business API — separate database from apps/auth
	DATABASE_URL: z.string().min(1),

	// Legacy database url used in data migration script (apps/api/src/scripts/)
	SOURCE_DATABASE: z.string().optional(),

	// JWKS endpoint served by apps/auth — used to fetch RS256 public keys at runtime.
	AUTH_JWKS_URL: z.string().min(1),

	// JWT issuer — must match BETTER_AUTH_URL in apps/auth (the `iss` claim in every token)
	AUTH_ISSUER: z.string().min(1),

	// JWT audience — comma-separated list of expected `aud` values set by apps/auth.
	AUTH_AUDIENCE: z.string().min(1),

	// Angular SPA base URL — used to build invitation links in emails
	CLIENT_BASE_URL: z.url().min(1).default('http://localhost:4200'),

	// Trusted origin for CORS (Angular SPA)
	CORS: z.string().default('http://localhost:4200'),

	// Orchestrator base URL — used for Swagger server list
	ORCHESTRATOR_URL: z.string().default('http://localhost:3000'),

	// Server
	PORT: z.coerce.number().default(3002),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	LOG_LEVEL: z.string().default('info'),

	// Google Cloud Storage — banner manifest
	GCS_BUCKET_URL: z.string().default(''),
	GCS_BANNERS_PATH: z.string().default('public/banners.json'),
	GCS_SERVICE_ACCOUNT_KEY: z.string().optional(),
	GCS_FETCH_TIMEOUT_MS: z.coerce.number().default(3000),

	// Redis — banner response cache
	REDIS_URL: z.string().default('redis://localhost:6379'),
	// PEM-encoded CA cert for `rediss://` TLS verification (e.g. GCP Memorystore).
	// Leave unset for plain `redis://` connections.
	REDIS_CA_CERT: z.string().optional(),
	BANNERS_CACHE_TTL_SECONDS: z.coerce.number().default(300),

	// Redis — tutorial video response cache
	TUTORIAL_VIDEO_CACHE_TTL_SECONDS: z.coerce.number().default(3600),

	// Sentry error monitoring
	SENTRY_DSN: z.string().optional(),
	// Injected at CI build time: GIT_SHA=$(git rev-parse --short HEAD)
	GIT_SHA: z.string().optional(),
	SENTRY_AUTH_TOKEN: z.string().optional(),
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),

	// Internal secret for orchestrator → api service-to-service authentication.
	// Generate with: openssl rand -hex 32. Must match API_SERVICE_SECRET in apps/orchestrator/.env.
	API_SERVICE_SECRET: z.string().min(1),

	// Banner storage type (gcs | mock)
	BANNERS_STORAGE_TYPE: z.string().default('gcs'),

	// OpenTelemetry
	OTEL_SERVICE_NAME: z.string().optional(),
	OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4317'),

	// Zoom platform API — shared credentials for email gateway
	ZOOM_AUTH_URL: z.string().default(''),
	ZOOM_USER: z.string().default(''),
	ZOOM_PASSWORD: z.string().default(''),
	ZOOM_EMAIL_API_URL: z.string().default(''),
	ZOOM_EMAIL_SENDER_ID: z.coerce.number().default(1),
	EMAIL_LOGO_URL: z
		.string()
		.url()
		.default('https://storage.googleapis.com/zoom-public-files/zoom-logo.png'),
	ZOOM_API_TIMEOUT_MS: z.coerce.number().default(10_000),
	ZOOM_API_RETRY_MAX: z.coerce.number().default(3),
	ZOOM_API_RETRY_BACKOFF_MS: z.coerce.number().default(200),

	// GCP Secret Manager integration (see packages/config)
	USE_GCP_SECRETS: z.stringbool().optional(),
	GCP_PROJECT_ID: z.string().optional(),

	// 256-bit hex key for AES-256-GCM PII column encryption (Drizzle encryptedText customType). Generate: openssl rand -hex 32
	PII_ENCRYPTION_KEY: z
		.string()
		.regex(
			/^[A-Fa-f0-9]{64}$/,
			'PII_ENCRYPTION_KEY must be a 64-character hexadecimal string (256 bits)',
		),
});

export type Env = z.infer<typeof apiEnvSchema>;

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		dotenv.config({ path: envPath });
		break;
	}
}

// Populated synchronously at module load from dotenv + process.env so that
// module-scope `const X = env.Y` reads (e.g. in telemetry.ts) see sensible
// values. loadEnv() then upgrades any GCP Secret Manager locators in place
// before NestFactory.create consumes secrets via DI.
const envState = apiEnvSchema.parse(process.env);
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

	const parsed = apiEnvSchema.parse(process.env);
	Object.assign(envState, parsed);
	loaded = true;
	return envState;
}
