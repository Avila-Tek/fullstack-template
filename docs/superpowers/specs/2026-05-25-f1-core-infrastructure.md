# F1: Core Infrastructure

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** —  
**Blocks:** F2, F3, F4, F5, F6, F7

---

## Objetivo

Construir la infraestructura base de la API: env con Zod, Drizzle configurado correctamente, Redis, health checks, filtros de excepciones, interceptor de respuesta, middleware de correlation ID, OTel, Pino y Swagger. Al terminar este feature la API arranca, responde health checks y tiene todas las piezas de infraestructura que los demás features necesitan.

---

## Fuera de scope

- Módulos de auth, RBAC, users
- Sentry scope middleware (se agrega en F7 cuando hay user context)
- auth-metrics OTel counter (se agrega en F2 cuando hay eventos de auth)

---

## Archivos a crear / modificar

```
apps/api/src/
├── env.ts                                      ← Zod schema completo (todas las vars de .env.example)
├── instrument.ts                               ← OTel SDK init; importado antes que todo en main.ts
├── main.ts                                     ← reescribir: loadEnv(), Helmet, CORS, Pino logger,
│                                                  ZodValidationPipe, Swagger (non-prod), bootstrap
│
├── shared/
│   └── domain-exception.ts                    ← clase base DomainException(error: string, meta?)
│
├── infrastructure/
│   ├── database/
│   │   └── drizzle.module.ts                  ← Pool con DATABASE_URL de env.ts, @Global()
│   │
│   ├── redis/
│   │   ├── redis.module.ts                    ← ioredis singleton, TLS condicional, graceful shutdown
│   │   └── redis.constants.ts                 ← export const REDIS_CLIENT = Symbol('REDIS_CLIENT')
│   │
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts               ← @Public() GET /health, GET /health/ready
│   │   └── database.health-indicator.ts       ← SELECT 1 via Drizzle
│   │
│   ├── filters/
│   │   ├── all-exceptions.filter.ts           ← catch-all fallback, siempre a Sentry
│   │   ├── http-exception.filter.ts           ← HttpException → { success, code, error, message }
│   │   └── domain-exception.filter.ts         ← DomainException → DomainToHttpMapper + i18n
│   │
│   ├── interceptors/
│   │   └── api-response.interceptor.ts        ← wraps { success: true, code: 200, data, ... }
│   │
│   ├── middleware/
│   │   └── correlation-id.middleware.ts       ← x-correlation-id header in/out + OTel baggage
│   │
│   ├── i18n/
│   │   └── domain-messages.ts                 ← estructura lista, catálogo vacío (AUTH_* se añade en F2)
│   │
│   ├── mapping/
│   │   └── domain-to-http.mapper.ts           ← mapeo vacío por ahora; AUTH_* codes en F2
│   │
│   ├── telemetry/
│   │   └── pino.config.ts                     ← pino-pretty en dev, OTel transport en prod
│   │
│   └── swagger/
│       └── swagger.setup.ts                   ← helper solo si NODE_ENV !== 'production'
│
└── app.module.ts                               ← importa DrizzleModule, RedisModule, HealthModule;
                                                   registra filters, interceptor, CorrelationIdMiddleware
```

---

## Detalles de implementación

### `env.ts` — Zod schema

```typescript
import { z } from 'zod';

const envSchema = z.object({
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
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

### Respuesta API estándar

```typescript
// Éxito
{ success: true, code: 200, data: T, error: null, message: null }

// Error de dominio
{ success: false, code: 422, data: null, error: 'AUTH_PASSWORD_REUSE', message: 'La contraseña ya fue usada' }

// Error 5xx (el código real va a logs/Sentry, nunca al cliente)
{ success: false, code: 500, data: null, error: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
```

### `DomainException`

```typescript
// src/shared/domain-exception.ts
export class DomainException extends Error {
  constructor(
    readonly error: string,                   // 'AUTH_<SCREAMING_SNAKE>'
    readonly meta?: Record<string, unknown>,  // solo para logs, nunca al cliente
  ) {
    super(error);
    this.name = this.constructor.name;
  }
}
```

### Orden de registro en `AppModule`

```typescript
providers: [
  // Filters (outermost primero)
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
  { provide: APP_FILTER, useClass: DomainExceptionFilter },

  // Interceptors
  { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
],
```

```typescript
configure(consumer: MiddlewareConsumer) {
  consumer.apply(CorrelationIdMiddleware).forRoutes('*');
}
```

### `RedisModule`

- Singleton ioredis con `REDIS_URL` de `env.ts`
- TLS habilitado si `REDIS_URL` comienza con `rediss://`
- `onModuleDestroy`: `await redis.quit()`
- Exporta `REDIS_CLIENT` token

---

## Acceptance Criteria

- [ ] `GET /health` → 200 `{ success: true, data: { status: 'ok' } }`
- [ ] `GET /health/ready` → 200 con Drizzle conectado; 503 si DB no disponible
- [ ] `GET /ruta-inexistente` → 404 `{ success: false, error: 'NOT_FOUND' }`
- [ ] Toda respuesta incluye header `X-Correlation-Id`
- [ ] Respuestas de éxito wrapped en `{ success: true, data: ... }`
- [ ] `env.ts` falla con error descriptivo si falta una variable requerida en startup
- [ ] Redis se conecta y `redis.ping()` retorna `PONG`
- [ ] `npx turbo typecheck` pasa
- [ ] `npx turbo lint` pasa

---

## Notas de implementación

- `instrument.ts` debe importarse como primera línea de `main.ts` (antes de cualquier import de NestJS) para que OTel instrumenta correctamente.
- Si `OTEL_EXPORTER_OTLP_ENDPOINT` no está configurado, OTel no exporta (no-op exporter). Si `SENTRY_DSN` no está configurado, `Sentry.init()` no se llama — degradación graceful, la app arranca igual.
- `Swagger` solo se configura si `NODE_ENV !== 'production'`.
- `helmet` con `contentSecurityPolicy: false` — requerido para que Swagger UI cargue en desarrollo; los scripts inline de Swagger UI violan CSP por defecto.
- `sameSite: 'lax'` en cookies — **no sobreescribir** el default de Better-Auth.
