# Spec: Auth, RBAC & módulos de soporte — Template Integration

> **Referencia canónica:** `auth-standard.md` en la raíz del repo.  
> **Punto de partida:** código Zoom copiado en `apps/api/src/modules/` y `packages/`.  
> Este spec define qué conservar, adaptar, eliminar y crear en cada capa.

---

## 1. Objetivo

Transformar las copias Zoom en una implementación limpia del template:

- **Sin** multi-sistema, organizations, system API keys, provisioning interno, terms.
- **Sin** adaptadores Zoom (`ZoomEmailAdapter`, `ZoomSmsAdapter`, `ZoomAuthService`).
- **Sin** referencias a `@zoom/*` — reemplazadas por `@repo/schemas`, `@repo/swagger`, `@repo/utils`.
- **Con** RBAC simple (roles + permisos, sin multi-tenant).
- **Con** todos los mecanismos de seguridad del estándar.
- **Con** Sentry integrado.
- **Con** módulos `users/`, `profiles/` y `role-templates/` funcionando con el stack del template.

---

## 2. Estado actual del repo

```
apps/api/src/
├── app.module.ts              ← simplificar
├── main.ts                    ← agregar instrument.ts
├── env.ts                     ← reemplazar schema Zod
└── modules/
    ├── auth/                  ← código Zoom multi-sistema — ADAPTAR
    ├── users/                 ← código Zoom — ADAPTAR
    ├── profiles/              ← código Zoom — ADAPTAR
    ├── role-templates/        ← código Zoom — ADAPTAR
    └── shared/user/           ← revisar

packages/
├── schemas/                   ← @repo/schemas — ApiResponse ✅, swagger ✅, user schemas ⚠️ Zoom-específicos
├── utils/                     ← @zoom/utils — renombrar + agregar DomainException y logger
└── ...
```

---

## 3. Packages — arreglos previos a todo lo demás

Estos bloquean la compilación de **todos** los módulos. Deben resolverse primero.

### 3.1 `packages/utils` → renombrar a `@repo/utils` + agregar utilidades base

`package.json` dice `@zoom/utils`. Cambiar a `@repo/utils`.

Agregar al package (actualmente solo tiene `safe-functions`, `safe-fetch`, `array-to-enum`):

```typescript
// DomainException — base de todas las excepciones de dominio
export class DomainException extends Error {
  constructor(
    public readonly error: string,
    public readonly meta?: Record<string, unknown>,
  ) { super(error) }
}

// Logger — token DI + interfaz
export const LOGGER_PORT: symbol
export interface IStructuredLogger {
  info(obj: object, msg?: string): void
  warn(obj: object, msg?: string): void
  error(obj: object, msg?: string): void
}

// i18n helpers
export type SupportedLocale = 'es' | 'en'
export function parseLocale(header?: string): SupportedLocale
export function resolveMessage(
  catalog: Record<string, Record<SupportedLocale, string>>,
  key: string,
  locale: SupportedLocale,
  fallback: string,
): string
export const httpMessages: Record<string, Record<SupportedLocale, string>>
```

### 3.2 `packages/schemas/src/swagger` → renombrar a `@repo/swagger`

`package.json` dentro de `packages/schemas/src/swagger/` dice `@zoom/swagger`. Cambiar a `@repo/swagger`.  
Los exports ya están completos: `ApiSafeResponse`, `ApiErrorResponses`, `buildSwaggerDocument`, etc.

### 3.3 `packages/schemas` — exportar `ApiResponse` + limpiar schemas de users

**Agregar export faltante en `src/index.ts`:**
```typescript
export * from './http';   // ApiResponse<T>, apiResponseSchema
```

**Limpiar schemas Zoom-específicos en `src/users/`:**

| Archivo | Problema | Acción |
|---|---|---|
| `current-user.schema.ts` | Tiene `businessProfileId`, `coreClientStatus` (Zoom) | Reemplazar con campos genéricos del template |
| `collaborator-edit-context.schema.ts` | Modelo de colaborador Zoom | Evaluar al adaptar `profiles/` |
| `member-profile-detail.schema.ts` | Modelo de perfil Zoom | Evaluar al adaptar `profiles/` |
| Resto de schemas de users | Pueden tener referencias Zoom | Revisar durante adaptación de módulos |

### 3.4 Actualizar todos los imports `@zoom/*` en el repo

Una vez renombrados los packages, hacer search & replace global:

| Antes | Después |
|---|---|
| `from '@zoom/utils'` | `from '@repo/utils'` |
| `from '@zoom/swagger'` | `from '@repo/swagger'` |
| `from '@zoom/schemas'` | `from '@repo/schemas'` |

---

## 4. Nuevas dependencias (`apps/api`)

```bash
npm install better-auth @thallesp/nestjs-better-auth ioredis postmark \
            @sentry/nestjs @sentry/node
```

`argon2` ya existe. Verificar compatibilidad con la versión de `better-auth` elegida.

---

## 5. Módulo `auth/` — inventario

### 5.1 CONSERVAR (solo corregir imports `@zoom/*` → `@repo/*`)

| Archivo |
|---|
| `infrastructure/brute-force/` (módulo completo) |
| `infrastructure/captcha/cloudflare-captcha-adapter.ts` |
| `infrastructure/filters/` (3 filtros) |
| `infrastructure/hash/argon2-hash-adapter.ts` |
| `infrastructure/health/` (módulo completo) |
| `infrastructure/interceptors/` (2 archivos) |
| `infrastructure/jwt/es256-jwt-mint.adapter.ts` |
| `infrastructure/mapping/domain-to-http.mapper.ts` |
| `infrastructure/redis/redis.module.ts` + `redis.constants.ts` |
| `infrastructure/redis/redis-{brute-force,change-email-pending,password-reset-rate-limit,two-factor-pending-method,verification-repository}.adapter.ts` |
| `infrastructure/telemetry/correlation-id.middleware.ts` |
| `infrastructure/telemetry/sentry-scope.middleware.ts` |
| `infrastructure/telemetry/sentry-user.interceptor.ts` |
| `infrastructure/token/hmac-token-adapter.ts` |
| `infrastructure/better-auth/two-factor-{filter,skip}.plugin.ts` |
| `infrastructure/database/repositories/drizzle-{account,password-history,session,session-audit-log,user,two-factor*,force-revoke-unit-of-work,jwk,change-email-audit-log,change-password-audit-log,password-reset-audit-log}.adapter.ts` |
| `infrastructure/database/schema/{account,device,jwk,jwks,login-audit-log,password-history,rate-limit,security-audit-log,session-audit-log,session,signup-audit-log,two-factor*,user,verification}.schema.ts` |
| `infrastructure/http/{admin-sessions,change-email,jwks,two-factor-status}.controller.ts` |
| `infrastructure/notifications/security-notification.adapter.ts` |
| `infrastructure/hooks/sign-up.hooks.ts` |
| `infrastructure/hooks/sign-in.hooks.ts` |
| `infrastructure/hooks/sign-out.hooks.ts` |
| `infrastructure/hooks/social-sign-in.hooks.ts` — `@BeforeHook /sign-in/social`: captcha + Redis state |
| `infrastructure/hooks/social-callback.hooks.ts` — `@BeforeHook`+`@AfterHook /callback/:id`: JWT mint + audit |
| `infrastructure/hooks/device.hooks.ts` |
| `infrastructure/hooks/email-verification.hooks.ts` |
| `infrastructure/hooks/forget-password.hooks.ts` |
| `infrastructure/hooks/reset-password.hooks.ts` |
| `infrastructure/hooks/change-email.hook.ts` |
| `infrastructure/hooks/change-password.hook.ts` |
| `infrastructure/hooks/token.hooks.ts` |
| `infrastructure/hooks/two-factor-{disable,enrollment,otp-rate-limit,send-otp,skip,verify-otp,verify-totp}.hook.ts` |
| `audit-log/drizzle-audit-log-adapter.ts` |
| `application/use-cases/{force-revoke-sessions,get-change-email-pending,list-user-sessions,check-password-history,activateTwoFactor,deactivateTwoFactor,get-token}.use-case.ts` |
| Ports `in/` + `out/` correspondientes |

### 5.2 ADAPTAR

| Archivo | Qué cambiar |
|---|---|
| `app.module.ts` | Eliminar wiring multi-sistema. Ver sección 8. |
| `main.ts` | `import './instrument'` como primer línea. Remover `ORCHESTRATOR_URL`. |
| `env.ts` | Reemplazar por schema limpio. Ver sección 9. |
| `infrastructure/better-auth/auth.ts` | Remover plugin `organization()`, `OAuthSystemContextStore`, `systemId` de hooks. |
| `infrastructure/email/zoom-email.adapter.ts` | Reemplazar por `postmark-email.adapter.ts`. Ver sección 6. |
| `infrastructure/database/db-schema.ts` | Remover exports de tablas eliminadas. |
| `infrastructure/swagger/better-auth-docs.module.ts` + `better-auth-virtual.controller.ts` | Remover `x-system-key`. Simplificar servers. |
| `infrastructure/guards/admin-bearer.guard.ts` | Adaptar a rol `super_admin`. |
| `infrastructure/guards/session.guard.ts` | Remover referencias a sistema/org. |
| `domain/exceptions/*.ts` (todos) | Cambiar `from '@zoom/utils'` → `from '@repo/utils'` |

### 5.3 ELIMINAR

| Archivo / carpeta | Motivo |
|---|---|
| `infrastructure/sms/zoom-sms.adapter.ts` | SMS Zoom-específico |
| `infrastructure/zoom/zoom-auth.service.ts` | Auth Zoom-específico |
| `infrastructure/hash/hmac-api-key-hash.adapter.ts` | System API keys |
| `infrastructure/system-key/` (3 archivos) | System API keys |
| `infrastructure/better-auth/better-auth-org.adapter.ts` | Organizations |
| `infrastructure/redis/redis-oauth-system-context-store.adapter.ts` | Multi-sistema |
| `infrastructure/hooks/phone-number-send-otp.hook.ts` | SMS |
| `infrastructure/guards/{internal-service,platform-admin,system-admin}.guard.ts` | Multi-sistema |
| `infrastructure/http/{system-members,systems,terms,users-internal}.controller.ts` | Multi-sistema |
| `infrastructure/database/schema/{system,system-api-key,system-membership,system-terms,organization,member,invitation,user-terms-acceptance}.schema.ts` | Multi-sistema |
| `infrastructure/database/repositories/drizzle-{system*,grant-access-unit-of-work,terms-repository,user-terms-acceptance-repository}.adapter.ts` | Multi-sistema |
| `application/use-cases/{accept-terms,deactivate-system,grant-system-access,list-system-members,list-systems,provision-user,register-system,revoke-system-access,rotate-system-key,update-member-role,update-system}.use-case.ts` | Multi-sistema |
| Ports `in/` + `out/` correspondientes | Eliminados con sus use cases |
| `domain/entities/system*.ts` | Multi-sistema |

### 5.4 CREAR nuevo

| Archivo | Descripción |
|---|---|
| `src/modules/rbac/` (módulo completo) | Ver sección 7 |
| `src/shared/guards/jwt-auth.guard.ts` | Guard global: cookie + Bearer JWT |
| `src/shared/guards/permissions.guard.ts` | Guard global: `@RequirePermissions` |
| `src/shared/guards/require-permissions.decorator.ts` | `@RequirePermissions()` |
| `src/shared/guards/current-permissions.decorator.ts` | `@CurrentPermissions()` |
| `src/shared/guards/current-user.decorator.ts` | `@CurrentUser()` |
| `src/shared/guards/public.decorator.ts` | `@Public()` |
| `infrastructure/email/postmark-email.adapter.ts` | Ver sección 6 |
| `instrument.ts` | Sentry init — primer import en `main.ts` |

---

## 6. Email — Postmark adapter (proveedor-agnóstico)

```typescript
// application/ports/out/email-service.port.ts  (no cambia nunca)
export abstract class EmailServicePort {
  abstract sendVerification(to: string, url: string): Promise<void>;
  abstract sendPasswordReset(to: string, url: string): Promise<void>;
  abstract send2faOtp(to: string, otp: string): Promise<void>;
  abstract sendSecurityAlert(to: string, event: string): Promise<void>;
}
```

Para cambiar de proveedor: crear `{proveedor}-email.adapter.ts` con la misma interfaz, cambiar el binding en `app.module.ts`, actualizar `.env`. Nadie más en la app se entera.

---

## 7. RbacModule — por qué es nuevo y cuál es su estructura

### Por qué no reutilizamos lo que existe

El código Zoom tiene dos piezas que *parecen* RBAC pero son otra cosa:

| Pieza Zoom | Qué hace realmente | Por qué no aplica |
|---|---|---|
| `profiles/PermissionResolver` | Resuelve permisos de **shipping** de un `BusinessProfile` (owner/member). Depende de `invitations/` (módulo inexistente) y `shared/permissions/resolved-permissions.type` (tipo inexistente). | Lógica de negocio logístico Zoom. No es RBAC genérico. |
| `role-templates/permission_catalog` | Catálogo con keys hardcodeadas (`share_locker_recipients`, `view_reports`) — permisos de logística Zoom. | Formato incorrecto para el estándar (`{resource}:{action}`). |
| `role_template` table | Plantilla de configuración para onboarding a un business profile — no es un "rol" asignable a un usuario. | Diferente concepto. |

El RBAC del estándar requiere tablas propias (`role`, `permission`, `role_permission`, `user_role`) y un `PermissionResolver` que resuelva `Set<string>` por `userId`, completamente distinto.

### Estructura

```
src/modules/rbac/
├── rbac.module.ts
├── domain/
│   ├── role.entity.ts
│   └── permission.entity.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── role.schema.ts
│   │   ├── permission.schema.ts
│   │   ├── role-permission.schema.ts
│   │   └── user-role.schema.ts
│   └── drizzle-role.repository.ts
└── application/
    └── permission-resolver.service.ts
```

Seed obligatorio: `super_admin` (is_system=true), `admin` (is_system=true), `viewer` (is_system=false).

---

## 8. Módulos `users/`, `profiles/`, `role-templates/` — inventario

### 8.1 Bloqueos comunes a los tres módulos

Todos importan de `@zoom/*`. Una vez resueltos los packages (sección 3), los imports se corrigen en bloque.

| Import roto | Reemplazar por |
|---|---|
| `DomainException` de `@zoom/utils` | `DomainException` de `@repo/utils` |
| `LOGGER_PORT`, `IStructuredLogger` de `@zoom/utils` | `@repo/utils` |
| `SupportedLocale`, `parseLocale`, `resolveMessage` de `@zoom/utils` | `@repo/utils` |
| `ApiResponse` de `@zoom/schemas` | `@repo/schemas` |
| `ApiSafeResponse`, `ApiErrorResponses` de `@zoom/swagger` | `@repo/swagger` |
| `@CurrentUser()` de `../../../../shared/guards/current-user.decorator` | `src/shared/guards/current-user.decorator.ts` (crear — sección 5.4) |

### 8.2 Módulo `users/`

**Bloqueo específico:** usa `BusinessProfileRepositoryPort` del módulo `profiles/` (ya existe ✅).

| Archivo | Acción |
|---|---|
| `users.module.ts` | ADAPTAR — actualizar imports, referenciar `ProfilesModule` |
| `get-current-user.use-case.ts` | ADAPTAR — reemplazar tipo `TCurrentUserResponse` con schema de `@repo/schemas` |
| `get-profile-detail.use-case.ts` | ADAPTAR — reemplazar tipo `TProfileDetailResponse` con schema de `@repo/schemas` |
| `users.controller.ts` + `profile.controller.ts` | ADAPTAR — `@zoom/swagger` → `@repo/swagger`, `@CurrentUser` → shared decorator |
| `domain/exceptions/*.ts` (5 archivos) | ADAPTAR — `DomainException` de `@zoom/utils` → `@repo/utils` |
| `infrastructure/i18n/messages.ts` | ADAPTAR — `SupportedLocale` de `@zoom/utils` → `@repo/utils` |

### 8.3 Módulo `profiles/`

**Bloqueos específicos:**
- `application/permission-resolver.service.ts` depende de módulo `invitations/` (no existe) y tipo `shared/permissions/resolved-permissions.type` (no existe).
- `infrastructure/adapters/locker-reader.adapter.ts` — feature de lockers Zoom, probablemente fuera de scope.

| Archivo | Acción |
|---|---|
| `infrastructure/persistence/business-profile.schema.ts` y similares | CONSERVAR — schemas del módulo |
| `infrastructure/persistence/shipping-service-enums.schema.ts` | CONSERVAR — usado por `role-templates/` |
| Todos los use cases y ports | ADAPTAR — corregir imports `@zoom/*` |
| `infrastructure/http/profiles-internal.controller.ts` | ADAPTAR — remover guard `InternalServiceGuard` (no existe), decidir reemplazo |
| `infrastructure/adapters/business-profile-billing-city-reader.adapter.ts` | REVISAR — puede tener deps externas Zoom |
| `infrastructure/adapters/locker-reader.adapter.ts` | ELIMINAR o STUB — feature de lockers Zoom fuera de scope del template |
| `domain/exceptions/*.ts` (20+ archivos) | ADAPTAR — `DomainException` de `@zoom/utils` → `@repo/utils` |
| `application/permission-resolver.service.ts` | ELIMINAR — es un resolver Zoom de permisos de shipping, NO es el RBAC del estándar. El `RbacModule.PermissionResolver` lo reemplaza completamente. |

### 8.4 Módulo `role-templates/`

> **Aclaración de concepto:** `role_template` es una **plantilla de configuración** para onboarding de usuarios a un business profile — NO es un "rol" del RBAC del estándar. Son conceptos distintos que coexisten.

**Bloqueo resuelto:** `roleTemplate` schema y enums de shipping viven en `profiles/` (ya copiado ✅).

**Importante:** `permission_catalog` tiene keys hardcodeadas Zoom (`share_locker_recipients`, `share_guide_recipients`, `view_reports`). El `PermissionsGuard` del estándar usa el formato `{resource}:{action}` del `RbacModule`, no este catálogo. Ambas tablas coexisten con propósitos distintos.

| Archivo | Acción |
|---|---|
| `role-templates.module.ts` | CONSERVAR — estructura limpia |
| `infrastructure/persistence/permission-catalog.schema.ts` | CONSERVAR — catálogo de permisos Zoom de shipping, distinto al RBAC del estándar |
| `infrastructure/persistence/role-template-permission.schema.ts` | ADAPTAR — actualizar import path de `roleTemplate` |
| `infrastructure/persistence/role-template-service.schema.ts` | ADAPTAR — actualizar imports de enums de shipping |
| `infrastructure/persistence/{business-profile-permission,business-profile-service,business-profile-service-recipient-whitelist}.schema.ts` | ELIMINAR — atan permisos a business profiles, Zoom-específico |
| `infrastructure/persistence/drizzle-role-template-repository.adapter.ts` | ADAPTAR — actualizar imports, reemplazar tipos `@zoom/schemas` |
| `application/{use-cases,ports}/**` | ADAPTAR — corregir imports `@zoom/*` |
| `domain/exceptions/role-template-not-found.exception.ts` | ADAPTAR — `DomainException` de `@repo/utils` |
| `infrastructure/i18n/messages.ts` | ADAPTAR — `SupportedLocale` de `@repo/utils` |
| `infrastructure/http/role-templates.controller.ts` | ADAPTAR — `@zoom/swagger` → `@repo/swagger` |

---

## 9. `AppModule` simplificado — wiring resultado

```typescript
@Module({
  imports: [
    LoggerModule,
    DrizzleModule,
    RedisModule,
    BruteForceModule,
    HealthModule,
    ThrottlerModule.forRoot([{ ttl: env.RATE_TTL, limit: env.RATE_LIMIT }]),
    AuthModule.forRoot({ auth, bodyParser: { json: { enabled: true } } }),
    RbacModule,
    UsersModule,
    ProfilesModule,
    RoleTemplatesModule,
    ...(env.NODE_ENV !== 'production' ? [BetterAuthDocsModule] : []),
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },   // outermost
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SentryUserInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
```

Middleware en `configure()`:
- `sentryScopeMiddleware` → `forRoutes('*')`
- `CorrelationIdMiddleware` → vía `expressApp.use()` en `main.ts`
- `SessionActivityMiddleware` → `forRoutes('*')` excepto `/api/v1/auth/*` y `/api/v1/public/*`

---

## 10. Variables de entorno

```bash
# Sentry
SENTRY_DSN=
SENTRY_ENVIRONMENT=development

# App
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:4200
APP_NAME=MyApp
COOKIE_PREFIX=app

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Redis
REDIS_URL=redis://localhost:6379

# Better-Auth
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000

# Argon2
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
PASSWORD_HISTORY_DEPTH=5

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

# Email (Postmark)
EMAIL_FROM=no-reply@example.com
POSTMARK_SERVER_TOKEN=

# 2FA
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

# Captcha (Cloudflare Turnstile)
CAPTCHA_ENABLED=false
CAPTCHA_SECRET_KEY=
```

---

## 11. Criterios de aceptación

### Packages
- [ ] `@zoom/utils` → `@repo/utils`: `DomainException`, `LOGGER_PORT`, `IStructuredLogger`, i18n helpers exportados y funcionando
- [ ] `@zoom/swagger` → `@repo/swagger`: `ApiSafeResponse`, `ApiErrorResponses` importables
- [ ] `@repo/schemas` exporta `ApiResponse<T>` desde index
- [ ] `npx turbo typecheck` pasa sin errores de imports `@zoom/*`

### Auth core
- [ ] `POST /api/v1/auth/sign-up/email` crea usuario, envía email, no hace login hasta verificar
- [ ] `POST /api/v1/auth/sign-in/email` hace login con cookie httpOnly, rechaza si no verificado
- [ ] `POST /api/v1/auth/sign-out` invalida sesión y cookie
- [ ] `POST /api/v1/auth/forget-password` envía email de reset con rate limit
- [ ] `POST /api/v1/auth/reset-password` cambia contraseña, valida historial

### Seguridad
- [ ] 5 intentos fallidos → cuenta bloqueada 15 min
- [ ] Contraseña reutilizada de las últimas 5 → `PASSWORD_REUSE`
- [ ] Inactividad > 30 min → `SESSION_EXPIRED_INACTIVITY`
- [ ] JWT Bearer válido da acceso a rutas protegidas
- [ ] Cookie httpOnly con `Secure: true` en producción

### RBAC
- [ ] Seed crea roles `super_admin`, `admin`, `viewer`
- [ ] `@RequirePermissions({ permissions: ['X:read'] })` → 403 sin permiso
- [ ] `@RequirePermissions({ permissions: ['A', 'B'], operator: 'OR' })` acepta con cualquiera
- [ ] `super_admin` tiene acceso a todo

### Módulos users / profiles / role-templates
- [ ] `GET /users/current` devuelve usuario autenticado sin campos Zoom
- [ ] `GET /profile` devuelve perfil sin campos Zoom
- [ ] `GET /role-templates` lista templates sin referencias a business-profile
- [ ] Ningún endpoint devuelve campos Zoom (`businessProfileId`, `coreClientStatus`, etc.)

### Sentry
- [ ] `instrument.ts` es el primer import en `main.ts`
- [ ] `SentryGlobalFilter` es el outermost filter
- [ ] Errores no capturados aparecen en Sentry con trace completo

### Tests
- [ ] Unit: `PermissionResolver`, `AuditLogService`, `SignInHook`, brute force
- [ ] Integration: sign-up → verify → sign-in
- [ ] Guards: `@Public()` pasa sin token, rutas protegidas fallan sin token

---

## 12. Fuera de alcance

- Multi-sistema / organizations
- System API keys (HMAC headers)
- SMS / teléfono
- Provisioning interno (`/internal/users`)
- Terms acceptance
- GCP Secret Manager
- Locker reader / shipping service (features Zoom-específicas — evaluar si `locker-reader.adapter.ts` aplica)

---

## 13. Plan de implementación

### Fase 0 — Packages (desbloquea todo)
1. Renombrar `@zoom/utils` → `@repo/utils` en `packages/utils/package.json`
2. Agregar `DomainException`, `LOGGER_PORT`, `IStructuredLogger`, i18n helpers a `packages/utils`
3. Renombrar `@zoom/swagger` → `@repo/swagger` en `packages/schemas/src/swagger/package.json`
4. Agregar `export * from './http'` en `packages/schemas/src/index.ts`
5. Search & replace global `@zoom/utils` → `@repo/utils`, `@zoom/swagger` → `@repo/swagger`, `@zoom/schemas` → `@repo/schemas`

### Fase 1 — Auth core
6. Instalar dependencias (`better-auth`, `postmark`, `@sentry/nestjs`, etc.)
7. `instrument.ts` + `env.ts` limpio
8. Eliminar archivos sección 5.3 (multi-sistema)
9. DB: eliminar schemas multi-sistema, agregar RBAC + `auth_audit_log`, migración + seed
10. `postmark-email.adapter.ts`
11. Adaptar `auth.ts` (remover org plugin, system context)

### Fase 2 — Guards y RBAC
12. Shared guards: `JwtAuthGuard`, `PermissionsGuard`, decoradores (`@Public`, `@CurrentUser`, `@RequirePermissions`, `@CurrentPermissions`)
13. `RbacModule` completo con `PermissionResolver`

### Fase 3 — Módulos de soporte
14. Adaptar `users/` (corregir imports, DTOs locales, referenciar `ProfilesModule`)
15. Adaptar `profiles/` (corregir imports, revisar `locker-reader`, eliminar 3 schemas Zoom)
16. Adaptar `role-templates/` (eliminar business-profile-*, corregir imports)

### Fase 4 — Wiring y cierre
17. `AppModule` con wiring completo (sección 9)
18. `main.ts` simplificado
19. Tests unit + integration
20. Checklist pre-producción (`auth-standard.md` §11)

### Fase 5 — Purga final de código Zoom sin uso

Una vez que `npx turbo typecheck` y todos los tests pasen, hacer un barrido completo para eliminar todo lo que se trajo de Zoom y no terminó siendo utilizado en el template.

**Proceso:**

1. **Dead code por TypeScript** — correr `npx turbo typecheck` con `noUnusedLocals: true` y `noUnusedParameters: true` para identificar exports y variables no referenciadas.

2. **Módulos/archivos sin imports** — buscar archivos que nadie importa:
   ```bash
   # Archivos .ts no importados por nadie en src/
   # Revisar manualmente los que aparezcan huérfanos
   ```

3. **Schemas de DB sin uso** — cualquier tabla Drizzle definida pero no referenciada en ningún repositorio ni migración activa.

4. **Ports sin implementación o sin consumidores** — ports `in/` sin use case que los implemente, ports `out/` sin adaptador registrado en ningún módulo.

5. **i18n `messages.ts` con keys sin uso** — keys de error que no corresponden a ninguna excepción activa.

6. **Variables de entorno en `env.ts` sin consumidores** — vars definidas en el schema Zod que ningún archivo lee.

**Criterio de completitud:** el repo no debe contener ningún archivo, clase, función, tabla, variable de entorno ni key de i18n que provenga del código Zoom y no sea referenciado por el código del template. Si hay duda sobre si algo se usará en el futuro, se elimina — se puede recuperar de git.
