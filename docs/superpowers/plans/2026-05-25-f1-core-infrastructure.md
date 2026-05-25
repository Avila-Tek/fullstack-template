# F1: Core Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the base infrastructure layer — Zod env validation, Fastify adapter, Drizzle, Redis, health checks, exception filters, API response interceptor, correlation ID middleware, OTel, Pino, and Swagger. At the end the API boots, responds to health checks, and has all infrastructure pieces that F2–F7 depend on.

**Architecture:** Hexagonal without CQRS. Infrastructure modules (`DrizzleModule`, `RedisModule`, `HealthModule`) are global (`@Global()`). Exception filters, interceptors, and middleware are registered in `AppModule` providers list. Domain stays framework-free.

**Tech Stack:** NestJS 11 + `@nestjs/platform-fastify`, Drizzle ORM + `pg`, ioredis, Zod v4, Pino + `nestjs-pino` + `pino-opentelemetry-transport`, `@opentelemetry/sdk-node` (traces + metrics + logs), `@sentry/nestjs`, `@nestjs/terminus`, `@fastify/helmet`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/api/src/env.ts` | Zod schema for all env vars |
| Create | `apps/api/src/instrument.ts` | Sentry init only (with `beforeSend` 4xx filter); first import in `main.ts` |
| Create | `apps/api/src/telemetry.ts` | OTel SDK (traces + metrics + logs + resources + SIGTERM); second import in `main.ts` |
| Rewrite | `apps/api/src/main.ts` | Bootstrap: Fastify adapter, Pino, Helmet, CORS, Swagger |
| Create | `apps/api/src/shared/domain-exception.ts` | Base `DomainException` class |
| Rewrite | `apps/api/src/app.module.ts` | Clean up deleted imports; wire new infra modules + global providers |
| Upgrade | `apps/api/src/infrastructure/database/drizzle.module.ts` | Use `env.ts` for connection string |
| Create | `apps/api/src/infrastructure/redis/redis.constants.ts` | `REDIS_CLIENT` token |
| Create | `apps/api/src/infrastructure/redis/redis.module.ts` | ioredis singleton, TLS, graceful shutdown |
| Create | `apps/api/src/infrastructure/filters/all-exceptions.filter.ts` | Catch-all → Sentry + INTERNAL_ERROR |
| Create | `apps/api/src/infrastructure/filters/http-exception.filter.ts` | `HttpException` → standard shape |
| Create | `apps/api/src/infrastructure/filters/domain-exception.filter.ts` | `DomainException` → mapper + i18n |
| Create | `apps/api/src/infrastructure/interceptors/api-response.interceptor.ts` | Wrap success → `{ success, code, data }` |
| Create | `apps/api/src/infrastructure/interceptors/skip-api-response.decorator.ts` | `@SkipApiResponse()` to opt out of the wrapper |
| Create | `apps/api/src/infrastructure/middleware/correlation-id.middleware.ts` | `x-correlation-id` in/out + OTel baggage |
| Create | `apps/api/src/infrastructure/i18n/domain-messages.ts` | Empty catalog (AUTH_* added in F2) |
| Create | `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts` | Empty map, defaults to 422 |
| Create | `apps/api/src/infrastructure/telemetry/pino.config.ts` | Pino options: pino-pretty dev, structured prod |
| Create | `apps/api/src/infrastructure/swagger/swagger.setup.ts` | Non-prod-only Swagger helper |
| Create | `apps/api/src/infrastructure/health/database.health-indicator.ts` | `SELECT 1` via Drizzle |
| Create | `apps/api/src/infrastructure/health/health.controller.ts` | `GET /health`, `GET /health/ready` |
| Create | `apps/api/src/infrastructure/health/health.module.ts` | Wires health controller + indicator |
| Create | `apps/api/.env.example` | All required env vars with sane defaults |
| Create | `apps/api/src/test/env.test.ts` | Tests |
| Create | `apps/api/src/test/shared/domain-exception.test.ts` | Tests |
| Create | `apps/api/src/test/infrastructure/filters/*.test.ts` | Tests |
| Create | `apps/api/src/test/infrastructure/interceptors/*.test.ts` | Tests |
| Create | `apps/api/src/test/infrastructure/middleware/*.test.ts` | Tests |
| Create | `apps/api/src/test/infrastructure/mapping/*.test.ts` | Tests |

---

## Task 1 — Install packages & switch to Fastify adapter

**Files:** `apps/api/package.json` (modify via npm commands)

- [ ] **Step 1: Install runtime dependencies**

Run from the repo root:
```bash
npm install -w apps/api \
  @nestjs/platform-fastify \
  fastify \
  @fastify/helmet \
  zod \
  ioredis \
  nestjs-pino \
  pino-http \
  @nestjs/terminus \
  @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/exporter-logs-otlp-grpc \
  @opentelemetry/exporter-metrics-otlp-grpc \
  @opentelemetry/resources \
  pino-opentelemetry-transport \
  @sentry/nestjs
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -w apps/api --save-dev pino-pretty
```

- [ ] **Step 3: Remove Express adapter**

```bash
npm uninstall -w apps/api @nestjs/platform-express @types/express
```

- [ ] **Step 4: Verify package.json has the new deps**

```bash
cat apps/api/package.json | grep -E "fastify|ioredis|zod|pino|terminus|opentelemetry|sentry"
```

Expected: all new packages appear, `@nestjs/platform-express` is gone.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json package-lock.json
git commit -m "chore(api): add fastify, ioredis, zod, pino, otel, sentry deps"
```

---

## Task 2 — `env.ts` (Zod schema + `.env.example`)

**Files:**
- Create: `apps/api/src/env.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/test/env.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/env.test.ts
import { describe, it, expect } from 'vitest';

// Import only the schema, not the parsed env (which reads process.env)
import { envSchema } from '../env';

describe('envSchema', () => {
  it('fails when DATABASE_URL is missing', () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: undefined,
        REDIS_URL: 'redis://localhost:6379',
        BETTER_AUTH_SECRET: 'a'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost:3000',
        API_BASE_URL: 'http://localhost:3000',
        CLIENT_URL: 'http://localhost:5173',
        EMAIL_FROM: 'noreply@example.com',
      }),
    ).toThrow();
  });

  it('applies defaults when optional vars are absent', () => {
    const result = envSchema.parse({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      API_BASE_URL: 'http://localhost:3000',
      CLIENT_URL: 'http://localhost:5173',
      EMAIL_FROM: 'noreply@example.com',
    });
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.ARGON2_MEMORY_COST).toBe(65536);
    expect(result.CAPTCHA_PROVIDER).toBe('cloudflare');
    expect(result.GOOGLE_ENABLED).toBe(false);
    expect(result.CAPTCHA_ENABLED).toBe(false);
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('rejects BETTER_AUTH_SECRET shorter than 32 chars', () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        BETTER_AUTH_SECRET: 'short',
        BETTER_AUTH_URL: 'http://localhost:3000',
        API_BASE_URL: 'http://localhost:3000',
        CLIENT_URL: 'http://localhost:5173',
        EMAIL_FROM: 'noreply@example.com',
      }),
    ).toThrow();
  });

  it('coerces numeric strings', () => {
    const result = envSchema.parse({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      API_BASE_URL: 'http://localhost:3000',
      CLIENT_URL: 'http://localhost:5173',
      EMAIL_FROM: 'noreply@example.com',
      PORT: '4000',
    });
    expect(result.PORT).toBe(4000);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/env.test.ts
```

Expected: `FAIL` with `Cannot find module '../env'` or similar.

- [ ] **Step 3: Create `apps/api/src/env.ts`**

```typescript
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

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  GIT_SHA: z.string().optional(),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
```

- [ ] **Step 4: Create `apps/api/.env.example`**

```bash
# ── App ──────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
APP_NAME=MyApp
COOKIE_PREFIX=app
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp

# ── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Better Auth ──────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=change-me-to-a-32-char-minimum-secret-value
BETTER_AUTH_URL=http://localhost:3000

# ── Password / Argon2 ────────────────────────────────────────────────────────
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
PASSWORD_HISTORY_DEPTH=5
PASSWORD_RESET_TOKEN_TTL_SECONDS=3600
SESSION_INACTIVITY_TIMEOUT_SECONDS=1800

# ── Rate limits ───────────────────────────────────────────────────────────────
SIGNUP_RATE_LIMIT_MAX=5
SIGNIN_RATE_LIMIT_MAX=10
RESET_RATE_LIMIT_MAX=3
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_GLOBAL_WINDOW_MS=60000

# ── Brute force ──────────────────────────────────────────────────────────────
BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_WINDOW_SECONDS=900

# ── Google OAuth (optional) ──────────────────────────────────────────────────
GOOGLE_ENABLED=false
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# ── Email / SMTP ─────────────────────────────────────────────────────────────
EMAIL_FROM=noreply@example.com
# EMAIL_SMTP_HOST=smtp.example.com
# EMAIL_SMTP_PORT=587
# EMAIL_SMTP_USER=
# EMAIL_SMTP_PASS=

# ── OTP ──────────────────────────────────────────────────────────────────────
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

# ── Captcha (optional) ───────────────────────────────────────────────────────
CAPTCHA_ENABLED=false
CAPTCHA_PROVIDER=cloudflare
# CAPTCHA_SECRET_KEY=

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL=info

# ── Observability (optional) ─────────────────────────────────────────────────
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
# OTEL_SERVICE_NAME=my-api
# SENTRY_DSN=
# GIT_SHA=
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/env.test.ts
```

Expected: `PASS` with 4 passing tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/env.ts apps/api/.env.example apps/api/src/test/env.test.ts
git commit -m "feat(api): add zod env schema and .env.example"
```

---

## Task 3 — `DomainException` base class

**Files:**
- Create: `apps/api/src/shared/domain-exception.ts`
- Create: `apps/api/src/test/shared/domain-exception.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/shared/domain-exception.test.ts
import { describe, it, expect } from 'vitest';
import { DomainException } from '../../shared/domain-exception';

describe('DomainException', () => {
  it('stores the error code', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.error).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('is an instance of Error', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex).toBeInstanceOf(Error);
  });

  it('sets the name to the class name', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.name).toBe('DomainException');
  });

  it('stores optional meta', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS', { attempt: 3 });
    expect(ex.meta).toEqual({ attempt: 3 });
  });

  it('meta is undefined when not provided', () => {
    const ex = new DomainException('AUTH_INVALID_CREDENTIALS');
    expect(ex.meta).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/shared/domain-exception.test.ts
```

Expected: `FAIL — Cannot find module '../../shared/domain-exception'`

- [ ] **Step 3: Create `apps/api/src/shared/domain-exception.ts`**

```typescript
export class DomainException extends Error {
  constructor(
    readonly error: string,
    readonly meta?: Record<string, unknown>,
  ) {
    super(error);
    this.name = this.constructor.name;
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/shared/domain-exception.test.ts
```

Expected: `PASS` — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/domain-exception.ts apps/api/src/test/shared/domain-exception.test.ts
git commit -m "feat(api): add DomainException base class"
```

---

## Task 4 — Upgrade `DrizzleModule` to use `env.ts`

**Files:**
- Modify: `apps/api/src/infrastructure/database/drizzle.module.ts`

No new unit test needed — `DrizzleModule` is wired configuration. Smoke-tested in Task 16.

- [ ] **Step 1: Rewrite `drizzle.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../../env';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      useFactory: async (): Promise<NodePgDatabase> => {
        const pool = new Pool({ connectionString: env.DATABASE_URL });
        return drizzle(pool);
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/infrastructure/database/drizzle.module.ts
git commit -m "feat(api): drizzle module uses env.ts for connection string"
```

---

## Task 5 — `RedisModule`

**Files:**
- Create: `apps/api/src/infrastructure/redis/redis.constants.ts`
- Create: `apps/api/src/infrastructure/redis/redis.module.ts`

No unit test for the module itself (wiring only). Integration smoke in Task 16.

- [ ] **Step 1: Create `redis.constants.ts`**

```typescript
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
```

- [ ] **Step 2: Create `redis.module.ts`**

```typescript
import { Global, Module, OnModuleDestroy, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '../../env';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (): Redis => {
        const tlsEnabled = env.REDIS_URL.startsWith('rediss://');
        return new Redis(env.REDIS_URL, {
          ...(tlsEnabled && { tls: {} }),
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/infrastructure/redis/
git commit -m "feat(api): add RedisModule with ioredis, TLS support, graceful shutdown"
```

---

## Task 6 — i18n catalog + domain-to-HTTP mapper (empty structures)

These are empty structures in F1 — `AUTH_*` codes are added in F2. Both are created now so filters can import them.

**Files:**
- Create: `apps/api/src/infrastructure/i18n/domain-messages.ts`
- Create: `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`
- Create: `apps/api/src/test/infrastructure/mapping/domain-to-http.mapper.test.ts`

- [ ] **Step 1: Write failing tests for the mapper**

```typescript
// apps/api/src/test/infrastructure/mapping/domain-to-http.mapper.test.ts
import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { domainToHttpStatus } from '../../../infrastructure/mapping/domain-to-http.mapper';
import { domainErrorMessage } from '../../../infrastructure/i18n/domain-messages';

describe('domainToHttpStatus', () => {
  it('returns 422 for unknown domain errors', () => {
    expect(domainToHttpStatus('UNKNOWN_ERROR')).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});

describe('domainErrorMessage', () => {
  it('returns the error code itself when no translation exists', () => {
    expect(domainErrorMessage('UNKNOWN_ERROR')).toBe('UNKNOWN_ERROR');
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/mapping/domain-to-http.mapper.test.ts
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create `domain-to-http.mapper.ts`**

```typescript
import { HttpStatus } from '@nestjs/common';

// Add domain-error-code → HTTP-status mappings here.
// AUTH_* codes are added in F2.
const statusMap: Record<string, number> = {};

export function domainToHttpStatus(error: string): number {
  return statusMap[error] ?? HttpStatus.UNPROCESSABLE_ENTITY;
}
```

- [ ] **Step 4: Create `domain-messages.ts`**

```typescript
// Add domain-error-code → human-readable message mappings here.
// AUTH_* messages are added in F2.
const messages: Record<string, string> = {};

export function domainErrorMessage(error: string): string {
  return messages[error] ?? error;
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/mapping/domain-to-http.mapper.test.ts
```

Expected: `PASS` — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/infrastructure/i18n/ apps/api/src/infrastructure/mapping/ \
  apps/api/src/test/infrastructure/mapping/
git commit -m "feat(api): add empty domain-messages catalog and domain-to-http mapper"
```

---

## Task 7 — `AllExceptionsFilter`

**Files:**
- Create: `apps/api/src/infrastructure/filters/all-exceptions.filter.ts`
- Create: `apps/api/src/test/infrastructure/filters/all-exceptions.filter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/filters/all-exceptions.filter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../../infrastructure/filters/all-exceptions.filter';

// Minimal mock for Sentry — avoids real network calls
vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
    send,
    status,
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('responds with 500 INTERNAL_ERROR for any exception', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('Unexpected'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_ERROR',
        data: null,
      }),
    );
  });

  it('captures the exception in Sentry', async () => {
    const Sentry = await import('@sentry/nestjs');
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    const err = new Error('boom');
    filter.catch(err, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/all-exceptions.filter.test.ts
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create `all-exceptions.filter.ts`**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.captureException(exception);

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: null,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/all-exceptions.filter.test.ts
```

Expected: `PASS` — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infrastructure/filters/all-exceptions.filter.ts \
  apps/api/src/test/infrastructure/filters/all-exceptions.filter.test.ts
git commit -m "feat(api): add AllExceptionsFilter (catch-all, Sentry capture)"
```

---

## Task 8 — `HttpExceptionFilter`

**Files:**
- Create: `apps/api/src/infrastructure/filters/http-exception.filter.ts`
- Create: `apps/api/src/test/infrastructure/filters/http-exception.filter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/filters/http-exception.filter.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../../../infrastructure/filters/http-exception.filter';

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    _send: sendFn,
    _status: status,
  };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('returns 404 for NotFoundException', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(new NotFoundException(), host as unknown as ArgumentsHost);
    expect(_status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 404, data: null }),
    );
  });

  it('returns 401 for UnauthorizedException', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(new UnauthorizedException(), host as unknown as ArgumentsHost);
    expect(_status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('includes string message', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new HttpException('Custom message', HttpStatus.BAD_REQUEST),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom message' }),
    );
  });

  it('includes error object error code when provided', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new HttpException({ error: 'AUTH_INVALID_CREDENTIALS', message: 'Bad creds' }, 401),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_INVALID_CREDENTIALS' }),
    );
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/http-exception.filter.test.ts
```

Expected: `FAIL`

- [ ] **Step 3: Create `http-exception.filter.ts`**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();
    const status = exception.getStatus();
    const raw = exception.getResponse();

    const isObj = typeof raw === 'object' && raw !== null;
    const message = isObj
      ? ((raw as { message?: string | string[] }).message ?? exception.message)
      : (raw as string);
    const errorCode = isObj
      ? ((raw as { error?: string }).error ?? httpStatusToCode(status))
      : httpStatusToCode(status);

    res.status(status).send({
      success: false,
      code: status,
      data: null,
      error: errorCode,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? `HTTP_${status}`;
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/http-exception.filter.test.ts
```

Expected: `PASS` — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infrastructure/filters/http-exception.filter.ts \
  apps/api/src/test/infrastructure/filters/http-exception.filter.test.ts
git commit -m "feat(api): add HttpExceptionFilter with standard error shape"
```

---

## Task 9 — `DomainExceptionFilter`

**Files:**
- Create: `apps/api/src/infrastructure/filters/domain-exception.filter.ts`
- Create: `apps/api/src/test/infrastructure/filters/domain-exception.filter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/filters/domain-exception.filter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { DomainExceptionFilter } from '../../../infrastructure/filters/domain-exception.filter';
import { DomainException } from '../../../shared/domain-exception';

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    _send: sendFn,
    _status: status,
  };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

  it('responds with 422 for unknown domain error by default', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new DomainException('UNKNOWN_DOMAIN_ERROR'),
      host as unknown as ArgumentsHost,
    );
    expect(_status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'UNKNOWN_DOMAIN_ERROR',
        data: null,
      }),
    );
  });

  it('includes the error code in the response body', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new DomainException('AUTH_INVALID_CREDENTIALS'),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_INVALID_CREDENTIALS' }),
    );
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/domain-exception.filter.test.ts
```

- [ ] **Step 3: Create `domain-exception.filter.ts`**

```typescript
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainException } from '../../shared/domain-exception';
import { domainToHttpStatus } from '../mapping/domain-to-http.mapper';
import { domainErrorMessage } from '../i18n/domain-messages';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();
    const status = domainToHttpStatus(exception.error);
    const message = domainErrorMessage(exception.error);

    res.status(status).send({
      success: false,
      code: status,
      data: null,
      error: exception.error,
      message,
    });
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/filters/domain-exception.filter.test.ts
```

Expected: `PASS` — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infrastructure/filters/domain-exception.filter.ts \
  apps/api/src/test/infrastructure/filters/domain-exception.filter.test.ts
git commit -m "feat(api): add DomainExceptionFilter using mapper + i18n"
```

---

## Task 10 — `SkipApiResponse` decorator + `ApiResponseInterceptor`

**Files:**
- Create: `apps/api/src/infrastructure/interceptors/skip-api-response.decorator.ts`
- Create: `apps/api/src/infrastructure/interceptors/api-response.interceptor.ts`
- Create: `apps/api/src/test/infrastructure/interceptors/api-response.interceptor.test.ts`

- [ ] **Step 1: Create `skip-api-response.decorator.ts` (no test needed — one-liner)**

```typescript
// apps/api/src/infrastructure/interceptors/skip-api-response.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SKIP_API_RESPONSE = 'skipApiResponse';

/** Apply to a controller or handler to bypass the ApiResponseInterceptor wrapper. */
export const SkipApiResponse = () => SetMetadata(SKIP_API_RESPONSE, true);
```

- [ ] **Step 2: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/interceptors/api-response.interceptor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from '../../../infrastructure/interceptors/api-response.interceptor';
import { SKIP_API_RESPONSE } from '../../../infrastructure/interceptors/skip-api-response.decorator';

function buildContext(skipValue?: boolean): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 200 }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildReflector(skip = false): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(skip),
  } as unknown as Reflector;
}

describe('ApiResponseInterceptor', () => {
  it('wraps a plain value in the standard success shape', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const handler: CallHandler = { handle: () => of({ id: 1, name: 'Alice' }) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));

    expect(result).toEqual({
      success: true,
      code: 200,
      data: { id: 1, name: 'Alice' },
      error: null,
      message: null,
    });
  });

  it('wraps null in the standard success shape', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const handler: CallHandler = { handle: () => of(null) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));

    expect(result).toEqual({
      success: true,
      code: 200,
      data: null,
      error: null,
      message: null,
    });
  });

  it('does not double-wrap already-shaped responses', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const alreadyShaped = { success: true, code: 200, data: 'hello', error: null, message: null };
    const handler: CallHandler = { handle: () => of(alreadyShaped) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));
    expect(result).toEqual(alreadyShaped);
  });

  it('passes through raw response when @SkipApiResponse() is set', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(true));
    const raw = [1, 2, 3];
    const handler: CallHandler = { handle: () => of(raw) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(true), handler));
    // Should be the raw array, NOT wrapped
    expect(result).toEqual(raw);
  });
});
```

- [ ] **Step 3: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/interceptors/api-response.interceptor.test.ts
```

- [ ] **Step 4: Create `api-response.interceptor.ts`**

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_API_RESPONSE } from './skip-api-response.decorator';

interface ApiResponse<T> {
  success: boolean;
  code: number;
  data: T | null;
  error: string | null;
  message: string | null;
}

function isAlreadyShaped(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'code' in value
  );
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_RESPONSE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    const res = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => {
        if (isAlreadyShaped(data)) return data;
        return {
          success: true,
          code: res.statusCode ?? 200,
          data: data ?? null,
          error: null,
          message: null,
        };
      }),
    );
  }
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/interceptors/api-response.interceptor.test.ts
```

Expected: `PASS` — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/infrastructure/interceptors/ \
  apps/api/src/test/infrastructure/interceptors/api-response.interceptor.test.ts
git commit -m "feat(api): add SkipApiResponse decorator and ApiResponseInterceptor"
```

---

## Task 11 — `CorrelationIdMiddleware`

**Files:**
- Create: `apps/api/src/infrastructure/middleware/correlation-id.middleware.ts`
- Create: `apps/api/src/test/infrastructure/middleware/correlation-id.middleware.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/middleware/correlation-id.middleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CorrelationIdMiddleware } from '../../../infrastructure/middleware/correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  function buildReqRes(existingId?: string) {
    const header = vi.fn();
    const req: Record<string, unknown> & { headers: Record<string, string | undefined> } = {
      headers: { 'x-correlation-id': existingId },
      correlationId: undefined,
    };
    const res = { header };
    const next = vi.fn();
    return { req, res, next, header };
  }

  it('generates a new UUID when no x-correlation-id header is present', () => {
    const { req, res, next, header } = buildReqRes();
    middleware.use(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(header).toHaveBeenCalledWith('x-correlation-id', req.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses the incoming x-correlation-id header', () => {
    const existingId = 'existing-id-123';
    const { req, res, next, header } = buildReqRes(existingId);
    middleware.use(req, res, next);

    expect(req.correlationId).toBe(existingId);
    expect(header).toHaveBeenCalledWith('x-correlation-id', existingId);
  });

  it('calls next()', () => {
    const { req, res, next } = buildReqRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/middleware/correlation-id.middleware.test.ts
```

- [ ] **Step 3: Create `correlation-id.middleware.ts`**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { context, propagation } from '@opentelemetry/api';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

type MinimalReq = {
  headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
};
type MinimalRes = { header(k: string, v: string): unknown };

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: MinimalReq, res: MinimalRes, next: () => void): void {
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER] as string | undefined) ?? randomUUID();

    req.correlationId = correlationId;
    res.header(CORRELATION_ID_HEADER, correlationId);

    // Propagate as OTel baggage so downstream spans inherit it
    const active = context.active();
    const baggage =
      propagation.getBaggage(active) ?? propagation.createBaggage();
    const newBaggage = baggage.setEntry('correlation.id', { value: correlationId });
    context.with(propagation.setBaggage(active, newBaggage), next);
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/middleware/correlation-id.middleware.test.ts
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/infrastructure/middleware/correlation-id.middleware.ts \
  apps/api/src/test/infrastructure/middleware/correlation-id.middleware.test.ts
git commit -m "feat(api): add CorrelationIdMiddleware with x-correlation-id + OTel baggage"
```

---

## Task 12 — `DatabaseHealthIndicator` + `HealthModule`

**Files:**
- Create: `apps/api/src/infrastructure/health/database.health-indicator.ts`
- Create: `apps/api/src/infrastructure/health/health.controller.ts`
- Create: `apps/api/src/infrastructure/health/health.module.ts`
- Create: `apps/api/src/test/infrastructure/health/database.health-indicator.test.ts`

- [ ] **Step 1: Write failing test for the health indicator**

```typescript
// apps/api/src/test/infrastructure/health/database.health-indicator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../../infrastructure/health/database.health-indicator';

describe('DatabaseHealthIndicator', () => {
  it('returns up status when SELECT 1 succeeds', async () => {
    const drizzle = { execute: vi.fn().mockResolvedValue([]) } as unknown as never;
    const indicator = new DatabaseHealthIndicator(drizzle);

    const result = await indicator.isHealthy();
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws HealthCheckError when SELECT 1 fails', async () => {
    const drizzle = {
      execute: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as never;
    const indicator = new DatabaseHealthIndicator(drizzle);

    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/health/database.health-indicator.test.ts
```

- [ ] **Step 3: Create `database.health-indicator.ts`**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../database/drizzle.module';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus('database', true);
    } catch (err) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus('database', false, { message: (err as Error).message }),
      );
    }
  }
}
```

- [ ] **Step 4: Create `health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health-indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  // Note: Add @Public() decorator in F3 once JwtAuthGuard is in place.
  @Get()
  @ApiOperation({ summary: 'Liveness probe — always 200 if app is running' })
  ping(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — 200 if DB is connected, 503 otherwise' })
  ready() {
    return this.health.check([() => this.db.isHealthy()]);
  }
}
```

- [ ] **Step 5: Create `health.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator],
})
export class HealthModule {}
```

- [ ] **Step 6: Run test — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/health/database.health-indicator.test.ts
```

Expected: `PASS` — 2 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/infrastructure/health/ \
  apps/api/src/test/infrastructure/health/
git commit -m "feat(api): add DatabaseHealthIndicator and HealthModule"
```

---

## Task 13 — `instrument.ts`, `telemetry.ts`, `pino.config.ts`, `swagger.setup.ts`

Configuration files. No unit tests — correctness verified in Task 16 (smoke).

**Files:**
- Create: `apps/api/src/instrument.ts`
- Create: `apps/api/src/telemetry.ts`
- Create: `apps/api/src/infrastructure/telemetry/pino.config.ts`
- Create: `apps/api/src/infrastructure/swagger/swagger.setup.ts`

> **Why two files?** `instrument.ts` initializes Sentry (must be truly first — Sentry patches error
> handling at import time). `telemetry.ts` initializes OTel SDK (must be before NestJS code, but
> after Sentry). Keeping them separate makes each file's purpose obvious and matches zoom-reference.

- [ ] **Step 1: Create `instrument.ts` (Sentry only)**

```typescript
// instrument.ts — Sentry init ONLY.
// MUST be the very first import in main.ts (before telemetry.ts and any NestJS code).
import type { ErrorEvent, EventHint } from '@sentry/nestjs';
import * as Sentry from '@sentry/nestjs';

const SENTRY_DSN = process.env.SENTRY_DSN;
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const GIT_SHA = process.env.GIT_SHA;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    release: GIT_SHA,
    tracesSampleRate: 0.1,
    // Only send server errors (≥500) to Sentry.
    // Expected client errors (4xx) are business-as-usual, not Sentry noise.
    beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
      const err = hint?.originalException as {
        status?: number;
        response?: { status?: number };
      } | null;
      const status = err?.status ?? err?.response?.status;
      if (typeof status === 'number' && status < 500) {
        return null;
      }
      return event;
    },
  });
}
```

- [ ] **Step 2: Create `telemetry.ts` (OTel SDK only)**

```typescript
// telemetry.ts — OpenTelemetry SDK.
// MUST be imported before any NestJS/application code (second import in main.ts).
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const SERVICE_NAME =
  process.env.OTEL_SERVICE_NAME ?? process.env.APP_NAME ?? 'api';

// Build SDK config — exporters only added when OTLP endpoint is configured.
// Without an endpoint the SDK still starts (auto-instrumentation is active),
// but nothing is exported (effectively a no-op tracer for local dev).
const sdkConfig: ConstructorParameters<typeof NodeSDK>[0] = {
  resource: resourceFromAttributes({ 'service.name': SERVICE_NAME }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // pino-opentelemetry-transport already exports logs over OTLP.
      // Enabling the pino instrumentation too would double-count every log record.
      '@opentelemetry/instrumentation-pino': { enabled: false },
      // fs instrumentation generates enormous trace noise (module loading etc.)
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
};

if (OTEL_ENDPOINT) {
  sdkConfig.traceExporter = new OTLPTraceExporter({ url: OTEL_ENDPOINT });
  sdkConfig.metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: OTEL_ENDPOINT }),
  });
  sdkConfig.logRecordProcessor = new SimpleLogRecordProcessor(
    new OTLPLogExporter({ url: OTEL_ENDPOINT }),
  );
}

const sdk = new NodeSDK(sdkConfig);
sdk.start();

// Graceful shutdown — flush pending spans/metrics/logs before the process exits.
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
```

- [ ] **Step 3: Create `pino.config.ts`**

```typescript
import { trace } from '@opentelemetry/api';
import type { Params } from 'nestjs-pino';
import { env } from '../../env';

export const pinoConfig: Params = {
  pinoHttp: {
    level: env.LOG_LEVEL,
    // Production: ship logs to OTel collector via pino-opentelemetry-transport
    //   → logs appear in Loki/Grafana alongside traces.
    // Development: pretty-print to stdout.
    transport:
      env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
        : { target: 'pino-opentelemetry-transport' },
    serializers: {
      req: (req: {
        method: string;
        url: string;
        headers?: Record<string, string>;
        remoteAddress?: string;
      }) => ({
        method: req.method,
        path: req.url,
        // correlationId is attached by CorrelationIdMiddleware before this serializer runs
        correlationId: (req as Record<string, unknown>).correlationId,
        sourceIp: req.headers?.['x-forwarded-for'] ?? req.remoteAddress ?? '',
      }),
      res: (res: { statusCode: number }) => ({
        statusCode: res.statusCode,
      }),
    },
    // Inject active OTel trace context so every log line is correlatable to a span.
    mixin: () => {
      const span = trace.getActiveSpan();
      const ctx = span?.spanContext();
      return {
        service: env.APP_NAME,
        env: env.NODE_ENV,
        traceId: ctx?.traceId ?? '',
        spanId: ctx?.spanId ?? '',
      };
    },
    autoLogging: {
      ignore: (req) =>
        req.url === '/health' || req.url === '/health/ready',
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true,
    },
  },
};
```

- [ ] **Step 4: Create `swagger.setup.ts`**

```typescript
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from '../../env';

export function setupSwagger(app: INestApplication): void {
  if (env.NODE_ENV === 'production') return;

  const config = new DocumentBuilder()
    .setTitle(env.APP_NAME)
    .setDescription(`${env.APP_NAME} API`)
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addCookieAuth('session_token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/instrument.ts \
  apps/api/src/telemetry.ts \
  apps/api/src/infrastructure/telemetry/pino.config.ts \
  apps/api/src/infrastructure/swagger/swagger.setup.ts
git commit -m "feat(api): add Sentry instrument.ts, OTel telemetry.ts, pino config, swagger setup"
```

---

## Task 14 — Rewrite `main.ts`

**Files:**
- Rewrite: `apps/api/src/main.ts`

- [ ] **Step 1: Rewrite `main.ts`**

```typescript
// 1. Sentry MUST be first — patches Node.js error handling at import time.
import './instrument';
// 2. OTel SDK MUST be before any NestJS/app imports — instruments HTTP, DB, etc.
import './telemetry';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from './shared/pipes/zodValidationPipe';
import { AppModule } from './app.module';
import { env } from './env';
import { pinoConfig } from './infrastructure/telemetry/pino.config';
import { setupSwagger } from './infrastructure/swagger/swagger.setup';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }), // Pino handled by nestjs-pino
    { bufferLogs: true },
  );

  // Use Pino as NestJS logger
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // Security headers (CSP disabled so Swagger UI loads in dev)
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });

  // CORS
  app.enableCors({
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    credentials: true,
  });

  // Global request validation (Zod DTOs)
  app.useGlobalPipes(new ZodValidationPipe());

  // Global URL prefix (all routes served under /api/v1)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready'],
  });

  // Swagger (non-production only)
  setupSwagger(app);

  await app.listen(env.PORT, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(api): rewrite main.ts — Sentry+OTel first, Fastify, Pino, Helmet, CORS, Swagger"
```

---

## Task 15 — `AppModule` cleanup + global wiring

**Files:**
- Rewrite: `apps/api/src/app.module.ts`

- [ ] **Step 1: Rewrite `app.module.ts`**

Replace the entire file — removes deleted auth/user module imports, integrates all new infra:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { env } from './env';
import { DrizzleModule } from './infrastructure/database/drizzle.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './infrastructure/health/health.module';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware';
import { pinoConfig } from './infrastructure/telemetry/pino.config';

@Module({
  imports: [
    // Pino logger (must be first so all other modules can inject Logger)
    LoggerModule.forRoot(pinoConfig),

    // Global rate limiter
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'global',
          ttl: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
          limit: env.RATE_LIMIT_GLOBAL_MAX,
        },
      ],
    }),

    // EventEmitter2 for domain events (F2+ use cases)
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Infrastructure
    DrizzleModule,
    RedisModule,
    HealthModule,
  ],
  providers: [
    // Global throttler guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Exception filters — registration order = priority (last registered = highest priority)
    // AllExceptionsFilter (catch-all fallback) → outermost
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // HttpExceptionFilter handles NestJS HttpExceptions
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // DomainExceptionFilter handles our domain errors — highest priority
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // Success response wrapper
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // CorrelationIdMiddleware must run before any auth or logging middleware
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

> **Note:** `@nestjs/event-emitter` may not be installed yet. If the import fails, install it: `npm install -w apps/api @nestjs/event-emitter`

- [ ] **Step 2: Install `@nestjs/event-emitter` if not present**

```bash
npm install -w apps/api @nestjs/event-emitter
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.module.ts package.json package-lock.json
git commit -m "feat(api): rewrite AppModule — remove legacy modules, wire infra + global providers"
```

---

## Task 16 — Typecheck, lint, and smoke validation

This task validates that everything compiles and the app can start.

**No new files.** Fix any type errors found.

- [ ] **Step 1: Run typecheck**

```bash
npx turbo typecheck --filter=@repo/api
```

Expected: `0 errors`. Fix any type errors before continuing.

Common errors to expect and fix:
- Missing `@nestjs/event-emitter` types → install if needed
- Import paths for `fastify` not resolving → check `@fastify/helmet` types
- `OTLPTraceExporter` generic argument → update import from `@opentelemetry/exporter-trace-otlp-grpc`

- [ ] **Step 2: Run linter**

```bash
npx turbo lint --filter=@repo/api
```

Expected: `0 errors`. Run `npx turbo lint:fix --filter=@repo/api` if there are auto-fixable issues.

- [ ] **Step 3: Run all unit tests**

```bash
npm -C apps/api test
```

Expected: All tests pass. (Green output from Vitest.)

- [ ] **Step 4: Verify app can start (requires a `.env` file)**

Copy `.env.example` and fill in minimal values:
```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env:
# - Set DATABASE_URL to a real PostgreSQL connection string
# - Set REDIS_URL to a real Redis connection string
# - Set BETTER_AUTH_SECRET to 32+ chars
# - Set BETTER_AUTH_URL, API_BASE_URL, CLIENT_URL, EMAIL_FROM
```

Start the app:
```bash
cd apps/api && node -e "require('./dist/main.js')" 2>/dev/null || \
  npx ts-node -r tsconfig-paths/register src/main.ts
```

Or using the dev server (do NOT leave running):
```bash
# Verify startup only — Ctrl+C after you see "Application is running"
cd apps/api && npm run dev
```

Expected output (after DB + Redis are available):
```
{"level":"info",...,"msg":"Application is running on: http://[::1]:3000"}
```

- [ ] **Step 5: Verify acceptance criteria manually**

With the app running:
```bash
# AC1: GET /health → 200 { success: true, data: { status: 'ok' } }
curl -s http://localhost:3000/health | jq .
# Expected: { "success": true, "code": 200, "data": { "status": "ok" }, ... }

# AC2: GET /health/ready → 200 with DB info
curl -s http://localhost:3000/health/ready | jq .
# Expected: { "success": true, ..., "data": { "status": "ok", "info": { "database": { "status": "up" } } } }

# AC3: GET /ruta-inexistente → 404 { success: false, error: 'NOT_FOUND' }
curl -s http://localhost:3000/api/v1/ruta-inexistente | jq .
# Expected: { "success": false, "code": 404, "error": "NOT_FOUND", ... }

# AC4: All responses include X-Correlation-Id header
curl -sv http://localhost:3000/health 2>&1 | grep -i x-correlation-id
# Expected: x-correlation-id: <some-uuid>

# AC5: Redis ping — check Redis module initialized
# (No endpoint; verify in app startup logs: no Redis errors)

# AC6: env.ts fails descriptively if required var is missing
# Remove DATABASE_URL from .env and restart — expect ZodError with clear message
```

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat(api): F1 core infrastructure complete — env, redis, health, filters, interceptor, middleware"
```

---

## Self-Review Checklist

All spec requirements covered:

| Acceptance Criterion | Task |
|---|---|
| `GET /health` → 200 `{ success: true, data: { status: 'ok' } }` | Task 12 |
| `GET /health/ready` → 200/503 with Drizzle | Task 12 |
| `GET /ruta-inexistente` → 404 `{ success: false, error: 'NOT_FOUND' }` | Task 8 |
| Every response includes `X-Correlation-Id` header | Task 11 |
| Success responses wrapped in `{ success: true, data: ... }` | Task 10 |
| `env.ts` fails with descriptive error on missing required var | Task 2 |
| Redis connects, `redis.ping()` → `PONG` | Task 5 |
| `npx turbo typecheck` passes | Task 16 |
| `npx turbo lint` passes | Task 16 |
| `instrument.ts` is first import, `telemetry.ts` is second | Task 14 |
| Sentry no-op if `SENTRY_DSN` not set | Task 13 |
| Sentry `beforeSend` drops all 4xx errors (no noise) | Task 13 |
| OTel SDK starts even without endpoint (no-op locally) | Task 13 |
| SIGTERM handler flushes pending spans/metrics/logs | Task 13 |
| Pino ships logs via `pino-opentelemetry-transport` in prod | Task 13 |
| Pino `mixin` injects `traceId`/`spanId` on every log line | Task 13 |
| `@SkipApiResponse()` decorator bypasses response wrapper | Task 10 |
| Swagger only in non-production | Task 13 |
| `helmet` with `contentSecurityPolicy: false` | Task 14 |
| `ThrottlerModule` uses `env.ts` vars | Task 15 |
