import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url(),
  CLIENT_URL: z.string().url(),
  APP_NAME: z.string().default('MyApp'),
  COOKIE_PREFIX: z.string().default('app'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  ARGON2_MEMORY_COST: z.coerce.number().default(65536),
  ARGON2_TIME_COST: z.coerce.number().default(3),
  ARGON2_PARALLELISM: z.coerce.number().default(4),
  PASSWORD_HISTORY_DEPTH: z.coerce.number().default(5),
  PASSWORD_RESET_TOKEN_TTL_SECONDS: z.coerce.number().default(3600),
  SESSION_INACTIVITY_TIMEOUT_SECONDS: z.coerce.number().default(1800),

  SIGNUP_RATE_LIMIT_MAX: z.coerce.number().default(5),
  SIGNIN_RATE_LIMIT_MAX: z.coerce.number().default(10),
  RESET_RATE_LIMIT_MAX: z.coerce.number().default(3),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().default(60000),

  BRUTE_FORCE_MAX_ATTEMPTS: z.coerce.number().default(5),
  BRUTE_FORCE_WINDOW_SECONDS: z.coerce.number().default(900),

  GOOGLE_ENABLED: z.coerce.boolean().default(false),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  EMAIL_FROM: z.string().email(),
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().default(587),
  EMAIL_SMTP_USER: z.string().optional(),
  EMAIL_SMTP_PASS: z.string().optional(),

  OTP_TTL_SECONDS: z.coerce.number().default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),

  CAPTCHA_SECRET_KEY: z.string().optional(),
  CAPTCHA_ENABLED: z.coerce.boolean().default(false),
  CAPTCHA_PROVIDER: z.enum(['cloudflare', 'google']).default('cloudflare'),

  // ── Observability — per Avila Tek observability standard ──────────────────
  // SERVICE_NAME is mandatory: {project}-{domain} format, e.g. "fullstack-api"
  // Process must refuse to start if absent (no default).
  SERVICE_NAME: z.string().min(1),
  SERVICE_VERSION: z.string().default('0.0.0'),
  SERVICE_NAMESPACE: z.string().default('default'),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
  GIT_SHA: z.string().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
