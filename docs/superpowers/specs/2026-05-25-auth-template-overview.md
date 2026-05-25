# Auth Template — Overview Design Spec

**Date:** 2026-05-25  
**Status:** Approved  
**Branch:** `auth-integration-template-lstanislao`

---

## 1. Objetivo

Integrar Better Auth como solución de autenticación y autorización por defecto en el fullstack template de Avila Tek. El resultado es un template production-ready que cualquier proyecto puede tomar como base, sin multi-sistema, con RBAC completo y todos los mecanismos de seguridad del `auth-standard.md`.

**Referencia de calidad:** `zoom-reference/auth/` — mismos estándares de seguridad, adaptados a single-system.

**Fuera de scope:** multi-sistema/organizaciones, system API keys, platform-admin, SMS, device tracking, terms acceptance.

---

## 2. Arquitectura

### Stack

| Decisión | Elección |
|---|---|
| Auth provider | Better-Auth (JWT plugin, twoFactor, passkey, Drizzle adapter) |
| Arquitectura | Hexagonal (ports & adapters), sin CQRS |
| ORM | Drizzle + PostgreSQL |
| Cache/estado | ioredis |
| Side effects | EventEmitter2 (`@OnEvent`) |
| Email callbacks | Direct port call (callbacks de BA son async, deben completar) |
| Cross-module | `RbacFacadePort` (facade pattern del CLAUDE.md) |

### Módulos

```
src/
├── infrastructure/           ← shared infrastructure (cargada en AppModule, sin módulo propio de dominio)
│   ├── database/             ← DrizzleModule (global)
│   ├── redis/                ← RedisModule (global)
│   ├── health/               ← HealthModule
│   ├── filters/              ← AllExceptions, Http, Domain
│   ├── interceptors/         ← ApiResponse, SentryUser
│   ├── middleware/           ← CorrelationId, SentryScope
│   ├── i18n/                 ← catálogo AUTH_* codes (es/en)
│   ├── mapping/              ← DomainToHttpMapper
│   ├── telemetry/            ← OTel, Sentry, Pino
│   ├── metrics/              ← auth_events_total OTel counter
│   └── swagger/              ← BetterAuthDocs (non-prod only)
│
├── auth/                     ← AuthModule
├── rbac/                     ← RbacModule (exporta RbacFacadePort)
└── users/                    ← UsersModule (demo RBAC)
```

### Patrón de módulo (sin CQRS)

```
{module}/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── events/              ← plain TS, zero framework imports
│   └── policies/
├── application/
│   ├── ports/
│   │   ├── in/              ← abstract classes (use-case interfaces)
│   │   └── out/
│   │       ├── {Entity}RepositoryPort.ts
│   │       └── facades/
│   │           └── {Module}FacadePort.ts
│   └── use-cases/           ← @Injectable(), implements in-port
├── infrastructure/
│   ├── persistence/
│   ├── web/                 ← controllers inyectan abstract in-port directamente
│   └── facades/             ← implements facade port
└── module.ts                ← exports solo in-ports y facade ports
```

**Regla de dependencias:** Presentation → Application → Domain; Infrastructure → Ports.  
`domain/` tiene cero imports de framework o Drizzle.  
`application/` tiene cero imports de `infrastructure/`.

### Flujo transversal de un request autenticado

```
CorrelationIdMiddleware → SentryScopeMiddleware → SessionActivityMiddleware*
  → JwtAuthGuard (cookie BA | Bearer ES256)
  → PermissionsGuard (@RequirePermissions vía RbacFacadePort)
  → Controller → Port → UseCase → Domain + Out-Port → Adapter

* excluye /api/v1/auth/* y /api/v1/public/*
```

### Cross-module: RbacFacadePort

```
AuthModule  ──imports──→  RbacModule (exports RbacFacadePort)
SharedGuards (PermissionsGuard) ──imports──→  RbacModule
```

`GetTokenUseCase` y `PermissionsGuard` inyectan `RbacFacadePort`. `RbacModule` es el único que sabe de Drizzle + roles + permisos.

---

## 3. Mecanismos de seguridad transversales

| Mecanismo | Implementación |
|---|---|
| Password hashing | Argon2id: 64MB memoryCost, timeCost 3, parallelism 4 |
| Password history | Últimas N (default 5) en `password_history` |
| Password policy | Complejidad mínima validada en `domain/policies/password.policy.ts` |
| Brute force | Redis INCR por email normalizado; lock tras MAX_ATTEMPTS en ventana |
| Rate limiting global | NestJS Throttler |
| Rate limiting por ruta | Better-Auth native (sign-up, sign-in, forget-password) |
| Password reset rate limit | Redis sliding window por email hash (fail-open) |
| Single-session | `session.create.before` databaseHook elimina sesión previa del userId |
| Inactivity timeout | `SessionActivityMiddleware` + Redis key con TTL |
| Captcha | Cloudflare Turnstile (primario) + Google reCAPTCHA v2/v3 (alternativo) |
| Email verificación | `requireEmailVerification: true` — no negociable |
| 2FA | TOTP + email OTP; backup codes; intentos limitados |
| Passkeys | Plugin `passkey()` de Better-Auth (WebAuthn) |
| JWT | ES256 15min TTL; audience = issuer = API_BASE_URL; `disableSettingJwtHeader: true` |
| JWKS | `/.well-known/jwks.json` marcado `@Public()` |
| Audit log | SHA256(email), SHA256(ip) — nunca PII en texto plano |
| Secure cookies | `useSecureCookies: NODE_ENV === 'production'`; sameSite: lax (default BA) |
| CORS | Origin restringido a `CLIENT_URL` |
| Helmet | Headers de seguridad en main.ts |
| Correlation ID | `x-correlation-id` generado/propagado + OTel baggage |
| Sentry | Scope por request (correlation_id, service, env); user context post-auth |
| OTel | Traces + metrics + logs via OTLP gRPC |
| Change email | `sessionInvalidBefore` seteado → sesiones anteriores expiran en próximo token refresh |
| Limitación conocida JWT | Bearer válido hasta 15min post-logout. Aceptado en base; denylist en §13 del auth-standard |

---

## 4. Schema de base de datos

### Tablas gestionadas por Better-Auth
`user`, `session`, `account`, `verification`, `twoFactor`, `jwks`, `rateLimit`, `passkey`

### Tablas custom

**`password_history`** — `id UUID PK`, `user_id TEXT`, `hashed_password TEXT`, `created_at TIMESTAMPTZ`  
INDEX: `(user_id, created_at DESC)`

**`auth_audit_log`** — `id UUID PK`, `event VARCHAR(64)`, `user_id TEXT`, `email_hash VARCHAR(64)`, `ip_hash VARCHAR(64)`, `user_agent TEXT`, `session_id TEXT`, `correlation_id VARCHAR(36)`, `metadata JSONB`, `created_at TIMESTAMPTZ`  
INDEX: `(user_id, created_at DESC)`, `(event, created_at DESC)`

**`role`** — `id UUID PK`, `key VARCHAR(64) UNIQUE`, `name VARCHAR(128)`, `is_system BOOL`, timestamps

**`permission`** — `id UUID PK`, `code VARCHAR(128) UNIQUE`, `resource VARCHAR(64)`, `action VARCHAR(32)`

**`role_permission`** — `(role_id, permission_id)` PK, ON DELETE CASCADE

**`user_role`** — `id UUID PK`, `user_id TEXT`, `role_id UUID`, `granted_by TEXT`, `granted_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ NULLABLE`

### Migración especial post-setup
```sql
CREATE UNIQUE INDEX user_normalized_email_unique ON "user" (normalized_email);
```
Better-Auth crea la columna pero no el índice único. Sin esto hay race condition en registros concurrentes.

### Seed obligatorio
- Roles: `super_admin` (`is_system=true`), `admin` (`is_system=true`), `viewer`
- Permisos base: `users:read`, `users:write`, `users:delete`, `users:admin`

---

## 5. Eventos de dominio (auth.*)

| Evento | Emitido por |
|---|---|
| `auth.signed_up` | `sign-up.hooks.ts` @AfterHook |
| `auth.signed_in` | `sign-in.hooks.ts` @AfterHook |
| `auth.signed_out` | `sign-out.hooks.ts` @AfterHook |
| `auth.password_reset` | `reset-password.hooks.ts` @AfterHook |
| `auth.password_changed` | `change-password.hooks.ts` @AfterHook |
| `auth.email_changed` | `change-email.hooks.ts` @AfterHook |
| `auth.jwt_refreshed` | `GetTokenUseCase` |
| `auth.session_expired` | `GetTokenUseCase` |
| `auth.session_revoked` | `ForceRevokeSessionsUseCase` |
| `auth.role_assigned` | `AssignRoleUseCase` |
| `auth.role_revoked` | `RevokeRoleUseCase` |
| `auth.2fa_enabled` | `ActivateTwoFactorUseCase` |
| `auth.2fa_disabled` | `DeactivateTwoFactorUseCase` |

**Regla:** `AuditLogListener` nunca lanza excepciones — captura y loguea internamente.

---

## 6. Catálogo de errores de dominio

| Código | HTTP | Cuándo |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Contraseña incorrecta |
| `AUTH_ACCOUNT_LOCKED` | 429 | Brute force superado |
| `AUTH_PASSWORD_REUSE` | 422 | Contraseña en historial |
| `AUTH_PASSWORD_POLICY_FAILED` | 400 | No cumple complejidad |
| `AUTH_NO_PASSWORD_ACCOUNT` | 400 | Cambio de password sin cuenta credential |
| `AUTH_SESSION_EXPIRED` | 401 | Redis inactivity key expiró |
| `AUTH_SESSION_INVALIDATED` | 401 | `sessionInvalidBefore` violado |
| `AUTH_EMAIL_DELIVERY_FAILED` | 503 | Fallo al enviar email |
| `AUTH_2FA_LOCKED` | 429 | OTP max attempts superado |
| `AUTH_2FA_OTP_RATE_LIMITED` | 429 | Rate limit de envío de OTP |
| `AUTH_2FA_TOTP_REPLAY` | 422 | Código TOTP ya usado |
| `AUTH_ROLE_NOT_FOUND` | 404 | roleKey no existe |
| `AUTH_FORBIDDEN` | 403 | No tiene rol super_admin |
| `AUTH_USER_NOT_FOUND` | 404 | userId inexistente |
| `AUTH_SELF_ROLE_REVOKE` | 422 | super_admin revocando su propio rol |
| `AUTH_OAUTH_CONTEXT_LOST` | 401 | Callback OAuth sin estado Redis |
| `AUTH_UNVERIFIED_SOCIAL_LINK_DENIED` | 403 | Usuario sin verificar link social con credential |

---

## 7. Features

| Feature | Depende de | Descripción |
|---|---|---|
| F1: Core Infrastructure | — | env, Drizzle, Redis, health, filters, interceptors, OTel, Pino |
| F2: Auth Core + Security | F1 | Better-Auth config, hooks base, Argon2id, brute force, captcha, audit log |
| F3: JWT + Guards + RBAC | F2 | GetToken, JwtAuthGuard, PermissionsGuard, roles, permisos, seed |
| F4: Password & Email Mgmt | F2, F3 | change password, reset, change email, sessionInvalidBefore |
| F5: Session Management | F2, F3 | list sessions, force revoke, security notifications |
| F6: Social OAuth + 2FA | F2 | Google OAuth, account linking, TOTP/OTP, activate/deactivate |
| F7: Users Module + Polish | F3 | demo RBAC, Sentry, métricas, Swagger, health completo |

---

## 8. Variables de entorno (.env.example)

```bash
# App
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000
APP_NAME=MyApp
COOKIE_PREFIX=myapp

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Redis
REDIS_URL=redis://localhost:6379

# Better-Auth
BETTER_AUTH_SECRET=           # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Argon2
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
PASSWORD_HISTORY_DEPTH=5
PASSWORD_RESET_TOKEN_TTL_SECONDS=3600

# Session
SESSION_INACTIVITY_TIMEOUT_SECONDS=1800

# Rate limiting
SIGNUP_RATE_LIMIT_MAX=5
SIGNIN_RATE_LIMIT_MAX=10
RESET_RATE_LIMIT_MAX=3
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_GLOBAL_WINDOW_MS=60000

# Brute force
BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_WINDOW_SECONDS=900

# Social OAuth
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Email
EMAIL_FROM=no-reply@example.com
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=

# 2FA
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

# Captcha
CAPTCHA_SECRET_KEY=
CAPTCHA_ENABLED=true

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=
SENTRY_DSN=
```

---

## 9. Referencia

- `docs/auth/auth-standard.md` — estándar canónico de auth/RBAC
- `docs/auth/superpowers/specs/2026-05-22-auth-standard-design.md` — diseño original aprobado
- `zoom-reference/` — referencia de calidad/seguridad
- `apps/api/CLAUDE.md` — arquitectura del template
