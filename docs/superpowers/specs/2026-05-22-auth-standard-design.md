# Auth Integration Template — Design Spec

**Date:** 2026-05-22  
**Branch:** `auth-integration-template`  
**Status:** Approved

---

## 1. Objetivo

Implementar desde cero el módulo de autenticación y autorización del fullstack template de Avila Tek siguiendo el `auth-standard.md`. El resultado es un template reutilizable que cualquier proyecto puede tomar como base, con todos los mecanismos de seguridad necesarios para producción.

**Fuera de scope:** multi-sistema/organizaciones, system API keys, platform-admin, phone number auth, Zoom providers.

---

## 2. Decisiones de arquitectura

| Decisión | Elección | Razón |
|---|---|---|
| Implementación | Desde cero | El módulo actual tiene conceptos multi-sistema entretejidos; refactorizarlo costaría más que partir limpio |
| Arquitectura | Hexagonal (ports & adapters) | Estándar del proyecto: domain puro, application sobre ports abstractos, infrastructure implementa |
| Comunicación cross-módulo | Facade ports (NestJS DI) | Sin CQRS — `RbacFacadePort` se exporta desde `RbacModule` y se inyecta en `AuthModule` |
| Side effects | EventEmitter2 | Audit log desacoplado de los hooks mediante `@OnEvent('auth.*')` |
| Email | Direct port call (no evento) | Los callbacks de Better-Auth son `async` y deben completar antes de retornar |
| Auth provider | Better-Auth | Ya establecido en el proyecto; soporta JWT plugin, twoFactor, passkey |
| ORM | Drizzle + PostgreSQL | Ya establecido |
| Cache/state | ioredis | Brute force counters, session activity, OAuth state, 2FA pending |

---

## 3. Módulos

### 3.1 `AuthModule`

Responsable de toda la lógica de autenticación: ciclo de vida de sesiones, hashing de contraseñas, historial de contraseñas, brute force, captcha, 2FA, passkeys, OAuth social.

**No gestiona** roles ni permisos — los delega a `RbacModule` a través del `RbacFacadePort`.

### 3.2 `RbacModule`

Catálogo de roles y permisos. Expone `RbacFacadePort` como única interfaz pública para otros módulos. Internamente usa Drizzle para consultar `role`, `permission`, `role_permission`, `user_role`.

### 3.3 `UsersModule`

Módulo demo que muestra el patrón hexagonal completo con guards de permisos. Lee usuarios de la tabla `user` de Better-Auth vía Drizzle. Usa `@RequirePermissions` para demostrar RBAC en un endpoint real.

---

## 4. Estructura de directorios completa

```
src/
├── app.module.ts
├── env.ts                                      ← Zod schema: todas las env vars
├── main.ts                                     ← Helmet, CORS, ZodValidationPipe, Swagger
│
├── infrastructure/
│   └── database/
│       ├── drizzle.module.ts
│       └── schema.ts                           ← relaciones cross-dominio (Drizzle)
│
├── auth/
│   ├── module.ts
│   │
│   ├── domain/
│   │   ├── exceptions/
│   │   │   ├── password-reuse.exception.ts
│   │   │   ├── account-locked.exception.ts
│   │   │   ├── session-expired.exception.ts
│   │   │   ├── session-invalidated.exception.ts
│   │   │   ├── oauth-context-lost.exception.ts
│   │   │   ├── email-delivery-failed.exception.ts
│   │   │   ├── two-factor-locked.exception.ts
│   │   │   └── password-policy-failed.exception.ts
│   │   └── policies/
│   │       └── password.policy.ts              ← validación de complejidad (pure TS, cero deps)
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   └── out/
│   │   │       ├── password-history.repository.ts
│   │   │       ├── session.repository.ts
│   │   │       ├── email.port.ts               ← sendVerification, sendReset, send2faOtp,
│   │   │       │                                  sendLoginAlert, sendFailedLoginAlert,
│   │   │       │                                  sendSessionRevoked
│   │   │       ├── brute-force.port.ts         ← increment, clear, getCount
│   │   │       └── captcha.port.ts             ← verify(token, ip?): Promise<{success: boolean}>
│   │   ├── events/
│   │   │   └── auth.events.ts                  ← AuthSignedInEvent, AuthSignedUpEvent,
│   │   │                                          AuthSignedOutEvent, AuthPasswordResetEvent,
│   │   │                                          AuthRoleAssignedEvent, AuthRoleRevokedEvent,
│   │   │                                          AuthJwtRefreshedEvent, AuthSessionExpiredEvent
│   │   └── use-cases/
│   │       ├── get-token.use-case.ts
│   │       └── force-revoke-sessions.use-case.ts
│   │
│   └── infrastructure/
│       ├── better-auth/
│       │   ├── better-auth.service.ts          ← @Injectable fábrica; recibe EmailPort,
│       │   │                                      ArgonHashPort, RedisClient vía DI
│       │   └── argon2.config.ts
│       │
│       ├── hooks/
│       │   ├── sign-up.hooks.ts                ← CaptchaPort + BruteForcePort + emit('auth.signed_up')
│       │   ├── sign-in.hooks.ts                ← BruteForcePort + emit('auth.signed_in')
│       │   ├── sign-out.hooks.ts               ← Redis cleanup + emit('auth.signed_out')
│       │   ├── social.hooks.ts                 ← CaptchaPort + Redis OAuth state
│       │   ├── two-factor.hooks.ts             ← BruteForcePort OTP attempts
│       │   └── password-reset.hooks.ts         ← PasswordPolicy + PasswordHistoryRepo
│       │                                          + emit('auth.password_reset')
│       │
│       ├── guards/
│       │   └── admin.guard.ts                  ← chequea roles[] del JWT, sin DB hit
│       │
│       ├── middleware/
│       │   ├── session-activity.middleware.ts  ← Redis TTL check + renovación en cada request
│       │   └── correlation-id.middleware.ts    ← x-correlation-id + OTel baggage propagation
│       │
│       ├── persistence/
│       │   ├── auth.schema.ts                  ← tablas Better-Auth (user, session, account, etc.)
│       │   ├── auth-schema-extensions.ts       ← unique index user.normalizedEmail
│       │   ├── password-history.schema.ts
│       │   ├── audit-log.schema.ts             ← auth_audit_log (hashes, no PII)
│       │   ├── password-history.repository-adapter.ts
│       │   └── session.repository-adapter.ts
│       │
│       ├── adapters/
│       │   ├── email.adapter.ts                ← implementa EmailPort (SMTP genérico / Resend)
│       │   ├── brute-force.adapter.ts          ← implementa BruteForcePort (Redis INCR/EXPIRE)
│       │   ├── argon2-hash.adapter.ts          ← implementa ArgonHashPort
│       │   └── captcha/
│       │       ├── cloudflare-captcha.adapter.ts   ← Turnstile siteverify
│       │       └── google-captcha.adapter.ts       ← reCAPTCHA v2/v3 con score threshold
│       │
│       ├── jwt/
│       │   └── es256-jwt-mint.adapter.ts       ← firma ES256 con JWK de Better-Auth
│       │
│       ├── redis/
│       │   ├── redis.module.ts                 ← ioredis singleton, TLS opcional, graceful shutdown
│       │   ├── redis-password-reset-rate-limit.adapter.ts  ← sliding window, fail-open
│       │   ├── redis-two-factor-pending.adapter.ts         ← TTL, Zod validation on read
│       │   └── redis-oauth-state.adapter.ts               ← oauth:ctx:{correlationId}, fire-once
│       │
│       ├── health/
│       │   ├── health.module.ts
│       │   ├── health.controller.ts            ← GET /health (liveness), GET /health/ready
│       │   ├── database.health-indicator.ts    ← SELECT 1 via Drizzle
│       │   ├── redis.health-indicator.ts       ← PING
│       │   └── auth.health-indicator.ts        ← SELECT 1 FROM session LIMIT 1
│       │
│       ├── telemetry/
│       │   ├── telemetry.ts                    ← OTel SDK: OTLP gRPC traces/metrics/logs
│       │   ├── sentry-scope.middleware.ts      ← tags: service, env, correlation_id por request
│       │   └── sentry-user.interceptor.ts      ← adjunta user.id a Sentry scope post-auth
│       │
│       ├── metrics/
│       │   └── auth-metrics.ts                 ← auth_events_total OTel counter (event, provider, error_type)
│       │
│       ├── filters/
│       │   ├── domain-exception.filter.ts      ← DomainException → HTTP + i18n + Sentry (≥500)
│       │   ├── http-exception.filter.ts        ← HttpException → HTTP + Sentry (5xx only)
│       │   └── all-exceptions.filter.ts        ← fallback catch-all, siempre a Sentry
│       │
│       ├── interceptors/
│       │   └── api-response.interceptor.ts     ← {code, data, error, message, success}
│       │
│       ├── listeners/
│       │   └── audit-log.listener.ts           ← @OnEvent('auth.*') → INSERT auth_audit_log
│       │                                          SHA256(email), SHA256(ip) — nunca texto plano
│       │
│       ├── i18n/
│       │   └── domain-messages.ts              ← catálogo es/en de todos los AUTH_* error codes
│       │
│       └── swagger/
│           ├── better-auth-docs.module.ts      ← solo en non-prod
│           └── better-auth-virtual.controller.ts  ← rutas BA documentadas en Swagger
│
├── rbac/
│   ├── module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Role.ts
│   │   │   └── Permission.ts
│   │   └── value-objects/
│   │       ├── RoleId.ts
│   │       └── PermissionId.ts
│   ├── application/
│   │   ├── ports/
│   │   │   ├── in/
│   │   │   │   └── rbac-facade.port.ts         ← abstract exportado a otros módulos:
│   │   │   │                                      resolveRoles(userId), resolvePermissions(userId)
│   │   │   └── out/
│   │   │       ├── role.repository.ts
│   │   │       └── permission.repository.ts
│   │   ├── permission-resolver.service.ts      ← filtra por expiresAt
│   │   └── use-cases/
│   │       ├── assign-role.use-case.ts         ← upsert + emit('auth.role_assigned')
│   │       └── revoke-role.use-case.ts         ← idempotente + emit('auth.role_revoked')
│   └── infrastructure/
│       ├── persistence/
│       │   ├── role.schema.ts
│       │   ├── permission.schema.ts
│       │   ├── role-permission.schema.ts
│       │   ├── user-role.schema.ts             ← expiresAt nullable, grantedBy
│       │   ├── role.repository-adapter.ts
│       │   └── permission.repository-adapter.ts
│       ├── facade/
│       │   └── rbac-facade.adapter.ts          ← implementa RbacFacadePort con PermissionResolver
│       └── web/
│           ├── roles.controller.ts             ← POST/DELETE /rbac/users/:userId/roles
│           │                                      @UseGuards(AdminGuard)
│           └── dto/
│               ├── assign-role.request.ts
│               └── revoke-role.request.ts
│
├── shared/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                   ← doble modo: cookie BA + Bearer ES256
│   │   ├── permissions.guard.ts                ← @RequirePermissions vía RbacFacadePort
│   │   ├── public.decorator.ts                 ← @Public()
│   │   ├── current-user.decorator.ts           ← @CurrentUser()
│   │   ├── require-permissions.decorator.ts    ← @RequirePermissions({permissions, operator})
│   │   └── jwt-user.interface.ts               ← JwtUser, PermissionRequirement
│   └── logger/
│       └── pino.config.ts                      ← OTel transport prod, pino-pretty dev
│
└── users/
    ├── module.ts
    ├── domain/
    │   ├── entities/User.ts
    │   └── value-objects/UserId.ts
    ├── application/
    │   ├── ports/out/user.repository.ts
    │   └── use-cases/
    │       ├── get-users.use-case.ts
    │       └── get-user-by-id.use-case.ts
    └── infrastructure/
        ├── persistence/
        │   ├── user.schema.ts
        │   └── user.repository-adapter.ts
        └── web/
            ├── user.controller.ts              ← @RequirePermissions({ permissions: ['users:read'] })
            └── dto/
                ├── user.response.ts
                └── get-users.request.ts
```

---

## 5. Base de datos

### Tablas gestionadas por Better-Auth
`user`, `session`, `account`, `verification`, `twoFactor`, `jwks`, `rateLimit`, `passkey`

### Tablas custom (migraciones del proyecto)

**`password_history`**
```sql
id UUID PK, user_id TEXT NOT NULL, hashed_password TEXT NOT NULL, created_at TIMESTAMPTZ
INDEX (user_id, created_at DESC)
```

**`auth_audit_log`**
```sql
id UUID PK, event VARCHAR(64), user_id TEXT, email_hash VARCHAR(64),
ip_hash VARCHAR(64), user_agent TEXT, session_id TEXT,
correlation_id VARCHAR(36), metadata JSONB, created_at TIMESTAMPTZ
INDEX (user_id, created_at DESC), INDEX (event, created_at DESC)
```

**`role`** — `id UUID PK`, `key VARCHAR(64) UNIQUE`, `name`, `is_system BOOL`, timestamps

**`permission`** — `id UUID PK`, `code VARCHAR(128) UNIQUE`, `resource VARCHAR(64)`, `action VARCHAR(32)`

**`role_permission`** — `(role_id, permission_id)` PK, ON DELETE CASCADE

**`user_role`** — `id UUID PK`, `user_id TEXT`, `role_id UUID`, `granted_by TEXT`, `granted_at`, `expires_at NULLABLE`

### Migración especial post-setup
```sql
CREATE UNIQUE INDEX user_normalized_email_unique ON "user" (normalized_email);
```
Necesaria porque Better-Auth crea la columna pero no el índice único. Sin esto hay race condition en registros concurrentes.

### Seed obligatorio
Roles: `super_admin` (is_system=true), `admin` (is_system=true), `viewer`  
Permisos: `users:create`, `users:read`, `users:update`, `users:delete`

---

## 6. Better-Auth — plugins habilitados

| Plugin | Propósito |
|---|---|
| `jwt()` | ES256 JWT signing vía JWKS interno; `disableSettingJwtHeader: true` |
| `twoFactor()` | TOTP + email OTP; backup codes; `storeOTP: 'hashed'` |
| `passkey()` | WebAuthn passkeys |

**Single-session:** `session.create.before` databaseHook elimina sesiones previas del mismo userId.  
**Inactivity:** `session.create.after` databaseHook hace seed de `session:{id}:activity` en Redis.

---

## 7. Flujos principales

### Sign-up
```
POST /api/v1/auth/sign-up/email
  @BeforeHook → CaptchaPort.verify() → BruteForcePort.increment()
  BA databaseHook user.create.before → normalizedEmail
  BA databaseHook account.create.after → appendPasswordHistory
  BA → hash Argon2id → crear user + account → enviar email verificación (EmailPort directo)
  @AfterHook → emit('auth.signed_up')
  AuditLogListener → INSERT auth_audit_log
← 201 { user }
```

### Sign-in
```
POST /api/v1/auth/sign-in/email
  @BeforeHook → BruteForcePort.increment() → si > MAX: AccountLockedException + emit audit
  BA → verificar hash → verificar email verificado
  BA databaseHook session.create.before → eliminar sesión previa (single-session)
  BA databaseHook session.create.after → seed Redis inactivity TTL
  @AfterHook → BruteForcePort.clear() → emit('auth.signed_in')
  AuditLogListener → INSERT auth_audit_log
← 200 { user, session } | { twoFactorRedirect: true }
```

### JWT refresh (GET /api/v1/auth/token)
```
  TokenHook @BeforeHook → GetTokenUseCase.execute()
    1. Verificar Redis session:id:activity → si ausente: SessionExpiredException
    2. Verificar session.invalidBefore
    3. RbacFacadePort.resolveRoles(userId)
    4. ES256 JWT mint (sub, email, emailVerified, sid, roles)
    5. Slide Redis TTL
    6. emit('auth.jwt_refreshed')
← { token: "eyJ..." }
```

### Request autenticado
```
CorrelationIdMiddleware → SessionActivityMiddleware → JwtAuthGuard (cookie | Bearer)
→ PermissionsGuard (@RequirePermissions vía RbacFacadePort)
→ Controller
```

---

## 8. Guards y middleware — orden de registro en AppModule

```typescript
// Filters (outermost primero)
{ provide: APP_FILTER, useClass: AllExceptionsFilter },
{ provide: APP_FILTER, useClass: HttpExceptionFilter },
{ provide: APP_FILTER, useClass: DomainExceptionFilter },

// Guards
{ provide: APP_GUARD, useClass: JwtAuthGuard },      // 1. cookie o Bearer
{ provide: APP_GUARD, useClass: PermissionsGuard },  // 2. @RequirePermissions

// Interceptors
{ provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
{ provide: APP_INTERCEPTOR, useClass: SentryUserInterceptor },
```

```typescript
// Middleware (configure())
CorrelationIdMiddleware → '*'
SentryScopeMiddleware   → '*'
SessionActivityMiddleware → '*' EXCEPT /api/v1/auth/*, /api/v1/public/*
```

---

## 9. Cross-module: RbacFacadePort

```typescript
// rbac/application/ports/in/rbac-facade.port.ts
export abstract class RbacFacadePort {
  abstract resolveRoles(userId: string): Promise<string[]>;
  abstract resolvePermissions(userId: string): Promise<Set<string>>;
}
```

`RbacModule` exporta `RbacFacadePort` y provee `RbacFacadeAdapter`.  
`AuthModule` importa `RbacModule` y declara `RbacFacadePort` como dependencia de `GetTokenUseCase`.  
`SharedGuards` (`PermissionsGuard`) también importa `RbacModule`.

---

## 10. EventEmitter2 — eventos y listeners

| Evento | Emitido por | Listener |
|---|---|---|
| `auth.signed_up` | `sign-up.hooks.ts` @AfterHook | `AuditLogListener` |
| `auth.signed_in` | `sign-in.hooks.ts` @AfterHook | `AuditLogListener` |
| `auth.signed_out` | `sign-out.hooks.ts` @AfterHook | `AuditLogListener` |
| `auth.password_reset` | `password-reset.hooks.ts` @AfterHook | `AuditLogListener` |
| `auth.jwt_refreshed` | `GetTokenUseCase` | `AuditLogListener` |
| `auth.session_expired` | `GetTokenUseCase` | `AuditLogListener` |
| `auth.role_assigned` | `AssignRoleUseCase` | `AuditLogListener` |
| `auth.role_revoked` | `RevokeRoleUseCase` | `AuditLogListener` |

**Regla:** `AuditLogListener` nunca lanza excepciones — captura y loguea errores internamente para no bloquear el flujo de auth.

---

## 11. Mecanismos de seguridad

| Mecanismo | Implementación |
|---|---|
| Password hashing | Argon2id: memoryCost 64MB, timeCost 3, parallelism 4 |
| Password history | Últimas `PASSWORD_HISTORY_DEPTH` (default 5) entradas en `password_history` |
| Brute force | Redis INCR por email normalizado; lock tras `BRUTE_FORCE_MAX_ATTEMPTS` en ventana de `BRUTE_FORCE_WINDOW_SECONDS` |
| Rate limiting global | NestJS Throttler: 100 req/min prod, 1000 dev |
| Rate limiting por ruta | Better-Auth native: sign-up, sign-in, forget-password, send-verification-email |
| Password reset rate limit | Redis sliding window por email hash (fail-open en caída de Redis) |
| Single-session | `session.create.before` databaseHook elimina sesión previa del userId |
| Inactivity timeout | `SessionActivityMiddleware` + Redis key con TTL `SESSION_INACTIVITY_TIMEOUT_SECONDS` |
| Captcha | Cloudflare Turnstile (primario) + Google reCAPTCHA v2/v3 (alternativo). Skip en dev via env |
| Email verificación obligatoria | `requireEmailVerification: true` en BA config — no negociable |
| 2FA | TOTP + email OTP; backup codes; intentos limitados por `BruteForcePort` |
| Passkeys | Plugin `passkey()` de Better-Auth (WebAuthn) |
| JWT | ES256 15min TTL; audience = issuer = API_BASE_URL; `disableSettingJwtHeader: true` |
| JWKS | Endpoint `/.well-known/jwks.json` marcado `@Public()` |
| Audit log | SHA256(email), SHA256(ip) — nunca PII en texto plano |
| Secure cookies | `useSecureCookies: NODE_ENV === 'production'`; sameSite: lax (default BA) |
| CORS | Origin restringido a `CLIENT_URL` |
| Helmet | Headers de seguridad en main.ts |
| Correlation ID | `x-correlation-id` generado/propagado + OTel baggage |
| Sentry | Scope por request (correlation_id, service, env); user context post-auth |
| OTel | Traces + metrics + logs via OTLP gRPC; pino-opentelemetry-transport en prod |
| Limitación conocida | JWT Bearer válido hasta 15min post-logout. Aceptado en base; denylist opcional para sectores regulados |

---

## 12. Variables de entorno

```bash
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
APP_NAME=MyApp
COOKIE_PREFIX=myapp
CORS_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
REDIS_URL=redis://localhost:6379

BETTER_AUTH_SECRET=        # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
PASSWORD_HISTORY_DEPTH=5
PASSWORD_RESET_TOKEN_TTL_SECONDS=3600

SESSION_INACTIVITY_TIMEOUT_SECONDS=1800

SIGNUP_RATE_LIMIT_MAX=5
SIGNIN_RATE_LIMIT_MAX=10
RESET_RATE_LIMIT_MAX=3

BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_WINDOW_SECONDS=900

GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=cloudflare   # cloudflare | google
CAPTCHA_SECRET_KEY=
SKIP_CAPTCHA=false

EMAIL_FROM=no-reply@example.com
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=

OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

OTEL_SERVICE_NAME=api
SENTRY_DSN=

PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX=5
PASSWORD_RESET_EMAIL_RATE_LIMIT_WINDOW_SECONDS=3600
```

---

## 13. Qué se elimina del módulo actual

| Componente | Razón |
|---|---|
| `system-key/` | Multi-sistema, fuera de scope |
| `platform-admin.guard.ts` | Reemplazado por `AdminGuard` + rol `super_admin` |
| `system-admin.guard.ts` | Multi-sistema |
| `internal-service.guard.ts` | Multi-sistema |
| `admin-bearer.guard.ts` | Multi-sistema |
| Plugin `organization` de BA | Multi-sistema |
| Plugin `phoneNumber` de BA | Out of scope base |
| `zoom-email.adapter.ts` | Reemplazado por adaptador SMTP genérico |
| `zoom/` client | Dependencia de Zoom, no aplica al template |
| `profiles/` module | Redundante con la tabla `user` de BA |
| `role-templates/` module | Concepto multi-tenant |

---

## 14. Checklist pre-producción (del auth-standard.md)

- [ ] `BETTER_AUTH_SECRET` generado con `openssl rand -base64 32`
- [ ] `requireEmailVerification: true` en config
- [ ] Argon2id con `memoryCost >= 65536`
- [ ] `PASSWORD_HISTORY_DEPTH >= 5`
- [ ] Migración `CREATE UNIQUE INDEX user_normalized_email_unique` aplicada
- [ ] Seed de roles `super_admin`, `admin`, `viewer` ejecutado
- [ ] Seed de permisos `users:*` ejecutado
- [ ] `SessionActivityMiddleware` excluye `/auth/*` y `/public/*`
- [ ] Redis disponible (rate limit + brute force + inactivity)
- [ ] `useSecureCookies: true` en producción
- [ ] JWKS endpoint marcado `@Public()`
- [ ] `disableSettingJwtHeader: true` en plugin `jwt()`
- [ ] `GetTokenUseCase` verifica Redis inactivity key y `session.invalidBefore`
- [ ] Ningún campo de `auth_audit_log` contiene PII en texto plano
- [ ] Decisión sobre JWT denylist documentada
