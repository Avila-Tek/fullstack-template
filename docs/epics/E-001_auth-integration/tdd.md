# TDD — E-001: Auth & RBAC Integration

> **Spec funcional:** [`docs/auth/spec.md`](../../auth/spec.md)  
> **Estándar canónico:** [`auth-standard.md`](../../../auth-standard.md)  
> Este documento cubre **arquitectura, decisiones de diseño y contratos técnicos**.  
> Los flujos funcionales, criterios de aceptación y el inventario de archivos viven en los specs referenciados.

---

## 1. Problem Statement

El repo contiene código copiado de un proyecto Zoom que implementa autenticación multi-sistema con organizations, provisioning interno, system API keys, SMS y adaptadores propietarios (`@zoom/*`). El objetivo es transformarlo en un template reutilizable:

- **Eliminar** toda lógica multi-sistema, Zoom-específica y de shipping.
- **Construir** un sistema de autenticación robusto, single-tenant con Better-Auth.
- **Construir** un módulo RBAC genérico (`role → permission → user_role`).
- **Establecer** contratos de interfaz estables (ports) para que cada proyecto adapte solo los adaptadores.

El resultado debe compilar sin referencias `@zoom/*`, pasar los criterios de aceptación del spec, y ser el punto de partida para futuros proyectos.

---

## 2. Decisiones de Diseño

### 2.1 Por qué Better-Auth

| Alternativa | Descartado porque |
|---|---|
| JWT manual (custom) | Requiere implementar PKCE, TOTP, JWKS rotation, session store — todo ya resuelto por BA |
| NextAuth.js | Acoplado a Next.js; no aplica a un API NestJS |
| Passport.js | Requiere strategies individuales; sin soporte nativo de 2FA, JWKS, databaseHooks |
| Supabase Auth | SaaS externo; no cumple el requisito de self-hosted |

Better-Auth provee: session lifecycle, PKCE OAuth, TOTP/OTP 2FA, JWKS auto-rotación, `databaseHooks`, y secondary-storage (Redis) con un único package.

### 2.2 Por qué `@thallesp/nestjs-better-auth`

Provee el sistema `@Hook` / `@BeforeHook` / `@AfterHook` con NestJS DI completo. Permite inyectar servicios NestJS (AuditLogService, Redis, PermissionResolver) en los hooks de Better-Auth sin necesidad de instancias de módulo globales o imports de módulo de manera estática.

### 2.3 Auth vive dentro del API (no microservicio separado)

Ver comparación en `auth-standard.md §1`. Resumen: el codebase destino es un monolito NestJS. El overhead de red de un microservicio separado no está justificado. El JWT audience es la misma API.

### 2.4 Dual-mode guard: cookie + Bearer

El `JwtAuthGuard` soporta dos modos en el mismo guard:

```
Browser/SPA          → httpOnly session cookie → auth.api.getSession()
Mobile/API client    → Authorization: Bearer <jwt> → verifyJwt() con JWKS
```

Un solo guard global evita guards duplicados por ruta. El modo se detecta automáticamente: si existe cookie de sesión válida → modo cookie; si existe `Authorization: Bearer` → modo JWT.

### 2.5 RBAC como módulo separado, no dentro de AuthModule

`RbacModule` exporta `PermissionResolver` que `PermissionsGuard` (en `shared/guards/`) consume. Separar evita circular dependency entre `AuthModule` y los guards globales. `AuthModule` puede usar `PermissionResolver` via import de `RbacModule`.

### 2.6 Postmark como adaptador de email

El port `EmailServicePort` es la interfaz estable. El adaptador `PostmarkEmailAdapter` es intercambiable. Para cambiar de proveedor: crear `{proveedor}-email.adapter.ts`, cambiar el binding en el módulo. Nadie más se entera.

### 2.7 Redis: único store para brute force, inactivity y rate limiting

Better-Auth usa Redis como `secondaryStorage` para sus counters de rate limit. El mismo cliente Redis se reutiliza para:
- Brute force: key `bf:{normalizedEmail}` → contador con TTL
- Inactivity: key `session:{id}:activity` → timestamp con TTL = `SESSION_INACTIVITY_TIMEOUT_SECONDS`
- OAuth state: key `oauth:ctx:{correlationId}` → TTL 10 min
- JWT denylist (opt-in): key `jwt:revoked:{jti}` → TTL restante del JWT

Un solo `RedisModule` global (@Global) provee el cliente en toda la app.

---

## 3. Arquitectura de Solución

```
┌─────────────────────────────────────────────────────────────────────┐
│                         apps/api (NestJS)                           │
│                                                                     │
│  main.ts                                                            │
│   └─ instrument.ts (Sentry init — primer import)                    │
│   └─ correlationIdMiddleware (Express level, pre-NestJS)            │
│   └─ NestFactory.create(AppModule, bodyParser: false)               │
│                                                                     │
│  AppModule                                                          │
│   ├─ DrizzleModule (@Global)    ← Pool PostgreSQL + ORM             │
│   ├─ RedisModule (@Global)      ← IORedis client                    │
│   ├─ BruteForceModule           ← Redis brute force counters        │
│   ├─ AuthModule.forRoot(auth)   ← Better-Auth + hooks + middleware  │
│   ├─ RbacModule                 ← roles + permisos + RolesController│
│   ├─ UsersModule                ← ADAPTAR Zoom                      │
│   ├─ ProfilesModule             ← ADAPTAR Zoom                      │
│   └─ RoleTemplatesModule        ← ADAPTAR Zoom                      │
│                                                                     │
│  Providers globales (APP_FILTER / APP_GUARD):                       │
│   SentryGlobalFilter            ← outermost                         │
│   AllExceptionsFilter                                               │
│   HttpExceptionFilter                                               │
│   DomainExceptionFilter                                             │
│   ApiResponseInterceptor                                            │
│   SentryUserInterceptor                                             │
│   ThrottlerGuard                ← NestJS rate limit                 │
│   JwtAuthGuard                  ← cookie OR Bearer JWT              │
│   PermissionsGuard              ← @RequirePermissions               │
└─────────────────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────┐                  ┌──────────────────────┐
│   PostgreSQL    │                  │        Redis         │
│                 │                  │                      │
│  user           │                  │  bf:{email}          │
│  session        │                  │  session:{id}:activity│
│  account        │                  │  oauth:ctx:{corrId}  │
│  verification   │                  │  jwt:revoked:{jti}   │
│  twoFactor      │                  │  rate-limit keys     │
│  jwks           │                  └──────────────────────┘
│  rateLimit      │
│  password_history│
│  auth_audit_log │
│  role           │
│  permission     │
│  role_permission│
│  user_role      │
└─────────────────┘
```

### Middleware stack (por request)

```
Request
  │
  ├─ correlationIdMiddleware   (Express level — antes de NestJS)
  ├─ sentryScopeMiddleware     (NestJS configure())
  ├─ SessionActivityMiddleware (NestJS configure(), excluye /auth/* y /public/*)
  │
  ├─ ThrottlerGuard            (APP_GUARD #1)
  ├─ JwtAuthGuard              (APP_GUARD #2)
  └─ PermissionsGuard          (APP_GUARD #3)
       │
       └─ Controller handler
```

---

## 4. Diseño de Componentes

### 4.1 AuthModule

```
src/modules/auth/
├── auth.module.ts
├── infrastructure/
│   ├── better-auth/
│   │   └── auth.ts                      ← betterAuth() config (plugins: jwt, twoFactor)
│   ├── database/
│   │   ├── auth-schema.ts               ← re-export tablas Better-Auth
│   │   ├── auth-schema-extensions.ts    ← uniqueIndex normalizedEmail
│   │   └── password-history.schema.ts   ← tabla custom
│   ├── filters/
│   │   ├── all-exceptions.filter.ts
│   │   ├── http-exception.filter.ts
│   │   └── domain-exception.filter.ts
│   ├── guards/
│   │   └── admin.guard.ts               ← lee roles[] del JWT, sin DB hit
│   ├── hooks/
│   │   ├── sign-up.hooks.ts
│   │   ├── sign-in.hooks.ts
│   │   ├── sign-out.hooks.ts
│   │   ├── social-sign-in.hooks.ts
│   │   ├── social-callback.hooks.ts
│   │   ├── email-verification.hooks.ts
│   │   ├── forget-password.hooks.ts
│   │   ├── reset-password.hooks.ts
│   │   ├── token.hooks.ts
│   │   └── two-factor-*.hook.ts (6 archivos)
│   ├── middleware/
│   │   └── session-activity.middleware.ts
│   ├── email/
│   │   └── postmark-email.adapter.ts
│   ├── mapping/
│   │   └── domain-to-http.mapper.ts
│   ├── jwt/
│   │   └── es256-jwt-mint.adapter.ts
│   ├── brute-force/
│   │   └── brute-force.module.ts
│   └── redis/
│       ├── redis.module.ts              ← @Global
│       └── redis.constants.ts
└── application/
    ├── audit-log.service.ts
    └── use-cases/
        ├── get-token.use-case.ts        ← verifica inactivity + sessionInvalidBefore + roles
        ├── force-revoke-sessions.use-case.ts
        └── request-password-reset.use-case.ts
```

**Contratos clave:**

```typescript
// EmailServicePort — interfaz estable que todos los adaptadores implementan
abstract class EmailServicePort {
  abstract sendVerification(to: string, url: string): Promise<void>;
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
  abstract send2faOtp(to: string, otp: string): Promise<void>;
  abstract sendSecurityAlert(to: string, event: string): Promise<void>;
}
```

```typescript
// GetTokenUseCase — núcleo del JWT refresh
// Verifica Redis inactivity → sessionInvalidBefore → resolveRoles → mint JWT → slide TTL → audit
interface GetTokenParams {
  userId: string; sessionId: string; email: string;
  emailVerified: boolean; sessionCreatedAt: Date; correlationId?: string;
}
```

### 4.2 RbacModule

```
src/modules/rbac/
├── rbac.module.ts                       ← exports: PermissionResolver
├── domain/
│   ├── role.entity.ts
│   └── permission.entity.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── role.schema.ts
│   │   ├── permission.schema.ts
│   │   ├── role-permission.schema.ts
│   │   └── user-role.schema.ts
│   ├── drizzle-role.repository.ts
│   └── http/
│       └── roles.controller.ts          ← POST/DELETE /rbac/users/:userId/roles
└── application/
    ├── permission-resolver.service.ts   ← resolve(userId) → Set<string>
    └── use-cases/
        ├── assign-role.use-case.ts
        └── revoke-role.use-case.ts
```

`RbacModule` debe ser **importado por `AuthModule`** (para que `TokenHook` pueda inyectar `PermissionResolver`) y **exportar `PermissionResolver`** para que `PermissionsGuard` en `shared/` lo consuma vía `AppModule`.

### 4.3 Shared Guards

```
src/shared/guards/
├── jwt-user.interface.ts          ← JwtUser { sub, email, emailVerified, sid, roles[] }
├── jwt-auth.guard.ts              ← doble modo: cookie (getSession) + Bearer (verifyJwt)
├── permissions.guard.ts           ← PermissionResolver.resolve() + @RequirePermissions
├── public.decorator.ts            ← @Public() + IS_PUBLIC_KEY
├── current-user.decorator.ts      ← @CurrentUser() → JwtUser
├── current-permissions.decorator.ts ← @CurrentPermissions() → Set<string>
└── require-permissions.decorator.ts  ← @RequirePermissions({ permissions, operator })
```

```typescript
// jwt-user.interface.ts — contrato central
export interface JwtUser {
  sub:           string;
  email:         string;
  emailVerified: boolean;
  sid:           string;
  roles:         string[];
}

export interface PermissionRequirement {
  permissions: string[];
  operator?:   'AND' | 'OR';
}
```

**Nota:** `JwtUser.roles` es un array para soportar usuarios con múltiples roles. `AdminGuard` verifica `roles.includes('super_admin')` sin DB hit.

### 4.4 Middleware

```
src/shared/middleware/
└── correlation-id.middleware.ts    ← función Express pura (no clase NestJS)
```

Se registra en `main.ts` vía `expressApp.use()` **antes** de `NestFactory.create()` para garantizar que corre antes de que Better-Auth cree sus objetos de request internos.

`SessionActivityMiddleware` sí es clase NestJS (usa `@Injectable()` y lee Redis). Se registra en `configure()` con exclusiones para `/api/v1/auth/*` y `/api/v1/public/*`.

---

## 5. Modelo de Datos

> Los DDL completos están en `auth-standard.md §3`. Esta sección cubre decisiones de diseño del modelo.

### 5.1 Tablas Better-Auth (gestionadas por el framework)

| Tabla | Columnas clave del template |
|---|---|
| `user` | `normalized_email` (TEXT UNIQUE — índice manual en §3.3), `two_factor_enabled` |
| `session` | `invalid_before` (TIMESTAMPTZ) — usado por `GetTokenUseCase` para revocación post-reset |
| `account` | `provider_id` ('credential', 'google') — guarda hash de password en `password` |
| `jwks` | Par EC usado por el plugin `jwt()` para firmar tokens ES256 |

**`normalized_email`:** Better-Auth crea la columna vía `user.create.before` databaseHook pero **no crea el UNIQUE INDEX**. El índice se agrega con una migración manual post-setup (ver `auth-standard.md §3.3`). Sin él, registros concurrentes pueden bypassear la deduplicación.

**`session.invalid_before`:** No es una columna estándar de Better-Auth — se agrega al schema extendido. Se setea a `now()` en password reset y email change para forzar re-autenticación en el próximo `/auth/token` sin revocar cookies manualmente.

### 5.2 Tablas custom

```
password_history (id UUID PK, user_id TEXT, hashed_password TEXT, created_at TIMESTAMPTZ)
  INDEX (user_id, created_at DESC)
  — Rotación: cuenta.create.after + account.update.after escriben + podan a PASSWORD_HISTORY_DEPTH

auth_audit_log (id, event, user_id, email_hash, ip_hash, session_id, correlation_id, metadata, created_at)
  INDEX (user_id, created_at DESC)
  INDEX (event, created_at DESC)
  — Regla: NINGÚN campo contiene PII en texto plano. Solo hashes SHA256.
```

### 5.3 Tablas RBAC

```
role (id UUID PK, key VARCHAR UNIQUE, name, description, is_system BOOL, created_at, updated_at)
  — is_system=true: no se puede eliminar (super_admin, admin)

permission (id UUID PK, code VARCHAR UNIQUE, resource VARCHAR, action VARCHAR, description, created_at)
  — code: '{resource}:{action}' — ej: 'users:read', 'invoices:create'

role_permission (role_id UUID FK, permission_id UUID FK — PK compuesta)
  — CASCADE DELETE en ambas FKs

user_role (id UUID PK, user_id TEXT, role_id UUID FK, granted_by TEXT, granted_at, expires_at TIMESTAMPTZ NULL)
  — UNIQUE (user_id, role_id)
  — expires_at NULL = permanente. PermissionResolver filtra expired.
```

### 5.4 Índice de schemas en drizzle.config.ts

```typescript
schema: [
  './src/modules/auth/infrastructure/database/auth-schema.ts',
  './src/modules/auth/infrastructure/database/auth-schema-extensions.ts',
  './src/modules/auth/infrastructure/database/password-history.schema.ts',
  './src/modules/rbac/infrastructure/persistence/*.schema.ts',
  // + schemas de users/, profiles/, role-templates/ ya presentes
],
```

---

## 6. API Surface

> Los contratos de request/response de Better-Auth están documentados en `auth-standard.md §10`. Esta sección solo cubre los **endpoints custom NestJS** (fuera del handler de Better-Auth).

| Método | Path | Guard | Handler |
|---|---|---|---|
| `POST` | `/rbac/users/:userId/roles` | `AdminGuard` | `RolesController.assign()` |
| `DELETE` | `/rbac/users/:userId/roles/:roleKey` | `AdminGuard` | `RolesController.revoke()` |
| `GET` | `/auth/sessions` | `JwtAuthGuard` | `AdminSessionsController` |
| `DELETE` | `/auth/sessions/:sessionId` | `JwtAuthGuard` | `AdminSessionsController` |
| `GET` | `/auth/two-factor/status` | `JwtAuthGuard` | `TwoFactorStatusController` |
| `GET` | `/auth/.well-known/jwks.json` | `@Public()` | `JwksController` |
| `POST` | `/auth/change-email/verify` | `JwtAuthGuard` | `ChangeEmailController` |

**Endpoints Better-Auth** (montados en `/api/v1/auth/*` por el framework, no son NestJS controllers):

```
POST /api/v1/auth/sign-up/email
POST /api/v1/auth/sign-in/email
POST /api/v1/auth/sign-out
POST /api/v1/auth/forget-password
GET  /api/v1/auth/reset-password          ← validar token
POST /api/v1/auth/reset-password
POST /api/v1/auth/token                   ← GetTokenUseCase (via TokenHook)
GET  /api/v1/auth/.well-known/jwks.json
POST /api/v1/auth/sign-in/social
GET  /api/v1/auth/callback/:provider
POST /api/v1/auth/two-factor/send-otp
POST /api/v1/auth/two-factor/verify-otp
POST /api/v1/auth/two-factor/verify-totp
```

### DTOs de RBAC

```typescript
// POST /rbac/users/:userId/roles
interface AssignRoleDto {
  roleKey:   string;
  expiresAt?: string;  // ISO 8601, null = permanente
}

// Respuestas siempre envueltas en ApiResponse<T>
// Ver @repo/schemas para el envelope
```

---

## 7. Diseño de Seguridad

> Los mecanismos detallados están en `auth-standard.md §5`, §13 y §14. Esta sección cubre las **propiedades arquitectónicas** que justifican las decisiones.

### 7.1 Defense-in-depth layers

```
Layer 1 — Network:    TLS (producción), Helmet CSP, CORS con allowedOrigins
Layer 2 — Rate limit: ThrottlerGuard global + Better-Auth customRules (Redis)
Layer 3 — Brute force: Redis counter bf:{normalizedEmail}, lockout en BRUTE_FORCE_MAX_ATTEMPTS
Layer 4 — Auth:       JwtAuthGuard (cookie httpOnly + Bearer ES256)
Layer 5 — Session:    inactivity timeout (Redis TTL) + sessionInvalidBefore
Layer 6 — Authz:      PermissionsGuard + @RequirePermissions + AdminGuard
Layer 7 — Audit:      AuditLogService sin PII (hashes SHA256 solamente)
```

### 7.2 Propiedades del JWT

| Propiedad | Valor | Justificación |
|---|---|---|
| Algoritmo | ES256 | Asimétrico — la API solo necesita la clave pública para verificar |
| TTL | 15 min | Ventana corta reduce exposición post-logout |
| audience | `API_BASE_URL` | La misma API — sin orchestrator externo |
| issuer | `API_BASE_URL` | Verificado por `JwtAuthGuard` en modo Bearer |
| `disableSettingJwtHeader` | `true` | Cliente debe llamar `/auth/token` explícitamente |
| JWKS | Auto-rotación por Better-Auth | Sin gestión manual de llaves |

### 7.3 Session invalidation vs. token revocation

**Problema:** revocar un JWT stateless requiere una denylist (Redis lookup por request) o esperar que expire.

**Decisión:** el modelo base acepta la ventana de hasta 15 min post-logout (ver `auth-standard.md §13`). La **revocación efectiva** se logra vía `session.invalidBefore`:

```
password reset / email change
  → session.invalidBefore = now()
  → Próxima llamada a /auth/token: GetTokenUseCase rechaza la sesión
  → Resultado: cliente pierde acceso en ≤ 15 min (JWT TTL)
```

Para revocación **inmediata** (fintech, compliance): activar denylist JWT (`jti` + Redis) — ver `auth-standard.md §13`.

### 7.4 Inactivity enforcement

El timer de inactividad solo se renueva en llamadas que pasan por `SessionActivityMiddleware` (API calls reales). `authClient.getSession()` dentro del `cookieCache.maxAge` (5 min) no renueva el timer — esto es intencional. Ver modelo completo en `auth-standard.md §14`.

Tolerancia máxima conocida: `SESSION_INACTIVITY_TIMEOUT_SECONDS + cookieCache.maxAge = 1800 + 300 = 35 min`.

### 7.5 Normalización de email

`normalizedEmail = email.toLowerCase().trim()` almacenado en DB vía `user.create.before` databaseHook. El brute force counter usa `normalizedEmail` para evitar bypass con mayúsculas. El UNIQUE INDEX garantiza deduplicación a nivel de DB.

---

## 8. Integraciones Externas

### 8.1 Better-Auth

- **Versión:** ver `apps/api/package.json` post-instalación
- **Plugins activos:** `jwt()`, `twoFactor()`
- **Adapter DB:** `drizzleAdapter(db, { provider: 'pg' })`
- **Secondary storage:** Redis vía `redisStorage` (rate limit counters)
- **Punto de montaje:** `/api/v1/auth/*` via `AuthModule.forRoot({ auth })`
- **bodyParser:** deshabilitado globalmente en NestFactory; re-habilitado solo para endpoints custom NestJS vía `bodyParser: { json: { enabled: true } }`

### 8.2 Redis (ioredis)

- **Cliente:** IORedis, singleton en `RedisModule` (@Global)
- **Keys usadas:**

| Key pattern | TTL | Propósito |
|---|---|---|
| `bf:{normalizedEmail}` | `BRUTE_FORCE_WINDOW_SECONDS` | Contador brute force |
| `session:{id}:activity` | `SESSION_INACTIVITY_TIMEOUT_SECONDS` | Inactivity timer |
| `oauth:ctx:{correlationId}` | 600s | Estado OAuth entre redirect y callback |
| `jwt:revoked:{jti}` | TTL restante del JWT | Denylist (opt-in) |
| BA rate-limit keys | Configurado por BA | Rate limit nativo de Better-Auth |

### 8.3 Postmark

- **Port:** `EmailServicePort` (abstracta, nunca importada directamente)
- **Adapter:** `PostmarkEmailAdapter` — único lugar donde vive el client de Postmark
- **Server token:** `POSTMARK_SERVER_TOKEN` en env
- **Métodos:** `sendVerification`, `sendPasswordReset`, `send2faOtp`, `sendSecurityAlert`

### 8.4 Sentry

- **Init:** `instrument.ts` importado como **primer import** en `main.ts` (antes de cualquier otro import)
- **Filter:** `SentryGlobalFilter` como `APP_FILTER` outermost
- **User enrichment:** `SentryUserInterceptor` adjunta `userId` y `email` al scope activo de Sentry en cada request autenticado
- **Scope propagation:** `sentryScopeMiddleware` (NestJS middleware) en todas las rutas

### 8.5 Cloudflare Turnstile (Captcha)

- **Guard:** validación en `SignUpHook @BeforeHook` y `SocialSignInHook @BeforeHook`
- **Habilitación:** `CAPTCHA_ENABLED=true/false`
- **Adapter:** `CloudflareCaptchaAdapter` implementa `CaptchaServicePort`

---

## 9. Grafo de Dependencias entre Módulos

```
AppModule
  ├── DrizzleModule (@Global)     ← sin dependencias internas
  ├── RedisModule (@Global)       ← sin dependencias internas
  ├── BruteForceModule            ← importa RedisModule
  ├── AuthModule                  ← importa DrizzleModule, RedisModule, RbacModule
  │     └── (usa) RbacModule.PermissionResolver  ← para TokenHook + AdminGuard
  ├── RbacModule                  ← importa DrizzleModule
  │     └── exports: PermissionResolver
  ├── UsersModule                 ← importa DrizzleModule, ProfilesModule
  ├── ProfilesModule              ← importa DrizzleModule
  └── RoleTemplatesModule         ← importa DrizzleModule, ProfilesModule
```

**Regla anti-circular:** `AuthModule` importa `RbacModule`. `RbacModule` NO importa `AuthModule`. Los guards globales (`JwtAuthGuard`, `PermissionsGuard`) viven en `shared/` y son registrados en `AppModule.providers`, no dentro de AuthModule.

---

## 10. Estrategia de Migración

El plan detallado vive en `docs/auth/spec.md §13`. Resumen arquitectónico:

```
Fase 0 — Packages       @zoom/* → @repo/*
Fase 1 — Auth core      Eliminar multi-sistema, instalar deps, adaptar auth.ts
Fase 2 — Guards + RBAC  Nuevos shared guards + RbacModule completo
Fase 3 — Módulos        users/, profiles/, role-templates/
Fase 4 — Wiring         AppModule final + main.ts + env.ts
Fase 5 — Purga          Dead code Zoom sin uso
```

**Invariante de cada fase:** `npx turbo typecheck` debe pasar al final de cada fase antes de continuar. Esto permite detectar regressions tempranas.

**Riesgo principal:** `ProfilesModule.PermissionResolver` actual depende de `invitations/` (módulo inexistente) y `@zoom/schemas` tipos. Puede causar errores de compilación hasta que se complete la fase 3. Mitigación: eliminar `PermissionResolver` del módulo profiles temprano (fase 2) y reemplazar por `RbacModule.PermissionResolver`.

---

## 11. Estrategia de Testing

> Los criterios de aceptación están en `docs/auth/spec.md §11`. Esta sección define la **cobertura mínima** por capa.

| Capa | Qué testear | Framework |
|---|---|---|
| Unit | `PermissionResolver.resolve()` — expiresAt filter | Vitest |
| Unit | `AuditLogService.log()` — PII masking | Vitest |
| Unit | `SignInHook` brute force — counter + lockout | Vitest |
| Unit | `GetTokenUseCase` — inactivity, invalidBefore, roles | Vitest |
| Unit | `AdminGuard` — roles[] check sin DB hit | Vitest |
| Integration | sign-up → verify-email → sign-in → /auth/token | Vitest + test DB |
| Integration | password-reset → invalidBefore → /auth/token rechaza | Vitest + test DB |
| Integration | role assign → permiso concedido, role revoke → permiso denegado | Vitest + test DB |
| Guard | `@Public()` — bypasa JwtAuthGuard | Vitest |
| Guard | `@RequirePermissions` — AND y OR operator | Vitest |

**Nota sobre mocks:** los tests de hooks que interactúan con Redis **deben** usar un Redis real (ioredis-mock o Redis de test). Los tests de guards pueden mockear `auth.api.getSession()` y `verifyJwt()`.

---

## 12. Variables de Entorno Nuevas

Las vars completas están en `auth-standard.md §11` y `docs/auth/spec.md §10`. Vars que **no existían** antes de este épico:

```
# Nuevas (no tenía el repo antes)
BETTER_AUTH_SECRET
BETTER_AUTH_URL
REDIS_URL
SESSION_INACTIVITY_TIMEOUT_SECONDS
BRUTE_FORCE_MAX_ATTEMPTS
BRUTE_FORCE_WINDOW_SECONDS
SIGNUP_RATE_LIMIT_MAX
SIGNIN_RATE_LIMIT_MAX
RESET_RATE_LIMIT_MAX
PASSWORD_HISTORY_DEPTH
PASSWORD_RESET_TOKEN_TTL_SECONDS
OTP_TTL_SECONDS
OTP_MAX_ATTEMPTS
CAPTCHA_ENABLED
CAPTCHA_SECRET_KEY
GOOGLE_ENABLED
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
POSTMARK_SERVER_TOKEN
SENTRY_DSN
ARGON2_MEMORY_COST / ARGON2_TIME_COST / ARGON2_PARALLELISM

# Renombradas / corregidas
DATABASE → DATABASE_URL
AUTH_JWKS_URL → (eliminada — JWKS servido por la misma app)
AUTH_ISSUER  → API_BASE_URL (issuer = la misma app)
AUTH_AUDIENCE → API_BASE_URL (audience = la misma app)
```

---

## 13. Checklist Pre-Implementación

- [ ] Leer `auth-standard.md` completo (especialmente §4, §5, §8, §13, §14)
- [ ] Leer `docs/auth/spec.md` §5 (inventario CONSERVAR / ADAPTAR / ELIMINAR)
- [ ] Confirmar versión de `better-auth` compatible con `argon2@^0.44.0`
- [ ] Confirmar que `@thallesp/nestjs-better-auth` soporta NestJS 11 (ver `@nestjs/core` en package.json)
- [ ] Confirmar que `session.invalidBefore` es una columna soportada por Better-Auth o requiere extensión de schema
- [ ] Decidir: ¿se activa la denylist JWT desde el día 0? (ver `auth-standard.md §13`)
- [ ] Coordinar: ¿los módulos `profiles/` y `role-templates/` se adaptan en paralelo o secuencial?
