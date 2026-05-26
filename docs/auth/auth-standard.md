# Estándar de Autenticación y Autorización — Avila Tek

> **Premisas:** auth vive dentro de la API central (no microservicio), sin multi-sistema, con RBAC completo y todos los mecanismos de seguridad.

---

## 1. Arquitectura

```
┌────────────────────────────────────────────────────────────┐
│                     Central NestJS API                      │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  AuthModule  │  │  RbacModule  │  │ Business Modules │  │
│  │  (Better-    │  │  (roles +    │  │ (usa guards)    │  │
│  │   Auth)      │  │  perms)      │  │                 │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                            │
│  Guards globales: JwtAuthGuard → PermissionsGuard          │
│  Middleware: correlationId → sessionActivity → appMiddleware│
└────────────────────────────────────────────────────────────┘
         ▲                              ▲
  Browser/SPA                    API/Mobile client
  (httpOnly cookie               (Authorization: Bearer <jwt>
   + JWT en memoria)              en cada request)
```

**Diferencias clave vs. arquitectura de microservicio separado:**

| Microservicio separado | Este estándar |
|---|---|
| `apps/auth` separado | Auth dentro de la misma app NestJS |
| Orchestrator como gateway | No se necesita |
| JWT audience = URL del orchestrator | JWT audience = la propia API |
| Multi-sistema (organizations) | Sin multi-sistema |
| Sesión revocada por userId + orgId | Sesión revocada solo por userId |

---

## 2. Estructura de módulos

```
src/
├── app.module.ts
├── env.ts                            ← Zod schema, env.BETTER_AUTH_*, env.JWT_*
├── main.ts                           ← await loadEnv() → bootstrap
│
├── auth/                             ← AuthModule
│   ├── auth.module.ts
│   ├── infrastructure/
│   │   ├── better-auth/
│   │   │   └── auth.ts               ← instancia Better-Auth + plugins
│   │   ├── hooks/                    ← @Hook decorators
│   │   │   ├── sign-up.hooks.ts
│   │   │   ├── sign-in.hooks.ts
│   │   │   ├── social-sign-in.hooks.ts   ← @BeforeHook /sign-in/social: captcha + Redis state
│   │   │   ├── social-callback.hooks.ts  ← @BeforeHook+@AfterHook /callback/:id: JWT mint + audit
│   │   │   ├── two-factor.hooks.ts
│   │   │   └── email-verification.hooks.ts
│   │   │   # device.hooks.ts — fuera del scope base (ver nota al pie de §2)
│   │   ├── guards/
│   │   │   ├── auth.guard.ts         ← valida session cookie
│   │   │   └── admin.guard.ts        ← chequea claim roles[] del JWT, sin DB hit
│   │   ├── middleware/
│   │   │   └── session-activity.middleware.ts
│   │   └── database/
│   │       └── auth-schema.ts        ← tablas de Better-Auth
│   └── application/
│       ├── audit-log.service.ts
│       └── use-cases/
│           ├── force-revoke-sessions.use-case.ts
│           └── request-password-reset.use-case.ts
│
├── rbac/                             ← RbacModule
│   ├── rbac.module.ts
│   ├── domain/
│   │   ├── role.entity.ts
│   │   └── permission.entity.ts
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── role.schema.ts
│   │   │   ├── permission.schema.ts
│   │   │   ├── role-permission.schema.ts
│   │   │   └── user-role.schema.ts
│   │   └── drizzle-role.repository.ts
│   ├── application/
│   │   ├── permission-resolver.service.ts  ← resuelve perms en runtime
│   │   └── use-cases/
│   │       ├── assign-role.use-case.ts
│   │       └── revoke-role.use-case.ts
│   └── infrastructure/
│       └── http/
│           └── roles.controller.ts         ← POST/DELETE /rbac/users/:userId/roles, solo super_admin
│
├── shared/
│   └── guards/
│       ├── jwt-auth.guard.ts             ← global, valida ES256 desde JWKS
│       ├── permissions.guard.ts          ← global, verifica @RequirePermissions
│       ├── public.decorator.ts           ← @Public()
│       ├── current-user.decorator.ts     ← @CurrentUser()
│       ├── current-permissions.decorator.ts ← @CurrentPermissions()
│       └── require-permissions.decorator.ts ← @RequirePermissions()
│
└── [business modules...]
```

> **Nota — `device.hooks.ts` fuera del scope base:** el tracking de dispositivos requiere
> tabla `device`, email service operativo, lógica de recovery token, y cookie `app_device_id`
> (1 año). Es una feature de seguridad válida pero no es prerequisito del auth. El
> `auth_audit_log` ya registra IP hash + UA en cada sign-in, cubriendo el caso de auditoría
> sin la complejidad adicional. Agregar device tracking cuando el producto lo requiera
> explícitamente (e.g., "notificar al usuario cuando detectamos un dispositivo nuevo").

---

## 3. Base de datos — Schema

### 3.1 Tablas de Better-Auth

Gestionadas 100% por el framework. No modificar manualmente, **salvo la migración post-setup de §3.3**.

| Tabla | Propósito |
|---|---|
| `user` | Usuarios de la plataforma. Columnas clave: `normalizedEmail`, `twoFactorEnabled`, `isAdmin` |
| `session` | Sesiones activas (7 días TTL, sliding window) |
| `account` | Cuentas vinculadas por proveedor (`credential`, `google`, etc.) |
| `verification` | Tokens de verificación de email |
| `twoFactor` | Secretos TOTP y backup codes |
| `jwks` | Par de llaves EC para firmar/verificar JWTs |
| `rateLimit` | Contadores de rate limit (Redis en producción) |
| `passwordHistory` | Últimos N hashes de contraseñas por usuario |

### 3.2 Tablas de RBAC

```sql
-- ROLES
CREATE TABLE role (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(64)  NOT NULL UNIQUE,  -- 'super_admin', 'admin', 'viewer'
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false, -- true = no se puede borrar
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PERMISOS (catálogo)
CREATE TABLE permission (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        VARCHAR(128) NOT NULL UNIQUE,  -- 'reports:read', 'users:write'
  resource    VARCHAR(64)  NOT NULL,         -- 'reports', 'users', 'invoices'
  action      VARCHAR(32)  NOT NULL,         -- 'read', 'write', 'delete', 'admin'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROLE → PERMISSIONS (M:N)
CREATE TABLE role_permission (
  role_id       UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- USER → ROLES (M:N)
CREATE TABLE user_role (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,                -- Better-Auth user.id (TEXT, no UUID)
  role_id    UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  granted_by TEXT,                         -- userId del admin que lo asignó
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,                  -- null = permanente
  UNIQUE (user_id, role_id)
);

-- AUDIT LOG
CREATE TABLE auth_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event          VARCHAR(64)  NOT NULL,
  user_id        TEXT,
  email_hash     VARCHAR(64),              -- SHA256(email), nunca texto plano
  ip_hash        VARCHAR(64),              -- SHA256(ip)
  user_agent     TEXT,
  device_id      VARCHAR(64),
  session_id     TEXT,
  correlation_id VARCHAR(36),
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX ON auth_audit_log (event, created_at DESC);
```

### 3.3 Migración post-setup — índice `normalizedEmail`

Better-Auth crea la columna `normalizedEmail` en la tabla `user` vía `databaseHook user.create.before`, pero **no crea el unique index**. Sin este índice, dos usuarios pueden registrarse con `foo@bar.com` y `FOO@BAR.COM` pasando el guard del `SignUpHook`.

Aplicar esta migración **inmediatamente después** de que Better-Auth crea las tablas por primera vez:

```sql
-- Ejecutar una sola vez, después del primer `db:migrate` de Better-Auth
CREATE UNIQUE INDEX user_normalized_email_unique
  ON "user" (normalized_email);
```

Con Drizzle, agregar al schema extendido de la tabla `user`:

```typescript
// src/auth/infrastructure/database/auth-schema-extensions.ts
// Better-Auth genera su propio schema; este archivo solo declara
// el índice adicional que el framework no crea.
import { uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './better-auth-schema';   // tabla generada por BA

export const userNormalizedEmailIndex = uniqueIndex(
  'user_normalized_email_unique',
).on(user.normalizedEmail);
```

Incluir este archivo en el `schema` del Drizzle config para que `db:generate` lo emita como migración:

```typescript
// drizzle.config.ts
export default defineConfig({
  schema: [
    './src/auth/infrastructure/database/better-auth-schema.ts',
    './src/auth/infrastructure/database/auth-schema-extensions.ts', // ← agregar
    './src/rbac/infrastructure/persistence/*.schema.ts',
  ],
  // ...
});
```

> **Por qué no basta con la validación en el hook:** el `SignUpHook` consulta `normalizedEmail` antes de crear el usuario, pero sin el índice hay una ventana de race condition en registros concurrentes. El índice es la garantía a nivel de base de datos.

### 3.5 Convención de códigos de permisos

```
{resource}:{action}
```

Ejemplos:

| Código | Descripción |
|---|---|
| `reports:read` | Ver reportes |
| `reports:admin` | Gestión completa de reportes |
| `users:read` | Ver usuarios |
| `users:write` | Crear y editar usuarios |
| `users:delete` | Eliminar usuarios |
| `settings:admin` | Gestión de configuración |

### 3.6 Roles predefinidos (seed obligatorio)

| key | `is_system` | Descripción |
|---|---|---|
| `super_admin` | true | Todos los permisos. No editable ni eliminable. |
| `admin` | true | Permisos operativos completos, sin permisos de sistema. |
| `viewer` | false | Solo lectura en todos los recursos. |

---

## 4. Configuración de Better-Auth

```typescript
// src/auth/infrastructure/better-auth/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, twoFactor } from 'better-auth/plugins';
import { db } from '../database/db';
import { env } from '../../../env';

export const auth = betterAuth({
  baseURL: env.API_BASE_URL,
  basePath: '/api/v1/auth',

  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.BETTER_AUTH_SECRET,

  // ── Session ──────────────────────────────────────────────
  session: {
    expiresIn:   60 * 60 * 24 * 7,           // 7 días
    updateAge:   60 * 60 * 24,               // refresh si >1 día transcurrido

    // cookieCache es un caché CLIENT-SIDE: authClient.getSession() retorna
    // sin hacer HTTP request durante maxAge segundos. Esto significa que
    // SessionActivityMiddleware NO corre en esas llamadas y el Redis TTL
    // no se renueva. Esto es INTENCIONAL: los polls de estado de auth (getSession)
    // no deben contar como actividad del usuario. Solo las llamadas reales
    // de API renuevan el timer de inactividad.
    //
    // Tolerancia conocida: el inactivity timeout efectivo es
    //   SESSION_INACTIVITY_TIMEOUT_SECONDS + cookieCache.maxAge
    // en el caso extremo donde el SPA solo hace getSession() y no llamadas de API.
    // Esto es aceptable porque un usuario que no hace llamadas de API no está
    // usando la app. Si el producto requiere enforcement estricto (compliance),
    // setear maxAge a 0 o deshabilitar cookieCache.
    //
    // NO deshabilitar cookieCache para "arreglar" la tolerancia: hacerlo
    // convertiría cada poll de getSession() en un renovador del timer,
    // impidiendo que usuarios idle sean deslogueados.
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  // ── Email / Password ─────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,           // NO negociable
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash:   (plain) => argon2.hash(plain, ARGON2_OPTIONS),
      verify: ({ hash, plain }) => argon2.verify(hash, plain),
    },
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendPasswordReset(user.email, url);
    },
  },

  // ── Email Verification ───────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.sendVerification(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  // ── Social providers ─────────────────────────────────────
  socialProviders: {
    ...(env.GOOGLE_ENABLED && {
      google: {
        clientId:     env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    }),
  },

  // ── Plugins ──────────────────────────────────────────────
  plugins: [
    jwt({
      jwt: {
        issuer:         env.API_BASE_URL,
        audience:       env.API_BASE_URL,     // misma app — sin orchestrator externo
        expirationTime: '15m',
        algorithm:      'ES256',
      },
    }),
    twoFactor({
      issuer: env.APP_NAME,
      otpOptions: {
        sendOTP: async ({ user, otp }) => emailService.send2faOtp(user.email, otp),
      },
    }),
  ],

  // ── Rate limiting ─────────────────────────────────────────
  rateLimit: {
    storage: 'secondary-storage',             // → Redis
    customRules: {
      '/sign-up/email':           { window: 3600, max: env.SIGNUP_RATE_LIMIT_MAX },
      '/sign-in/email':           { window: 900,  max: env.SIGNIN_RATE_LIMIT_MAX },
      '/forget-password':         { window: 3600, max: env.RESET_RATE_LIMIT_MAX  },
      '/send-verification-email': { window: 3600, max: 3 },
    },
  },

  // ── Database hooks ────────────────────────────────────────
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Single-session: revocar sesión previa del mismo usuario
          await db.delete(sessionTable).where(
            and(
              eq(sessionTable.userId, session.userId),
              ne(sessionTable.id, session.id),
            ),
          );
          return { data: session };
        },
        after: async (session) => {
          // Seed de inactivity key en Redis
          await redis.set(
            `session:${session.id}:activity`,
            Date.now(),
            'EX', env.SESSION_INACTIVITY_TIMEOUT_SECONDS,
          );
        },
      },
    },
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            normalizedEmail: user.email.toLowerCase().trim(),
          },
        }),
      },
    },
  },

  trustedOrigins: [env.CLIENT_URL],

  advanced: {
    cookiePrefix: env.COOKIE_PREFIX ?? 'app',

    // Secure flag solo en producción (dev corre sobre http).
    // Better-Auth lo aplica a todas las cookies de sesión.
    useSecureCookies: env.NODE_ENV === 'production',

    // sameSite: Better-Auth usa 'lax' por defecto — NO sobreescribir a 'strict'.
    // 'strict' rompe los flujos OAuth (el callback del proveedor es una navegación
    // cross-site) y los links de verificación de email / reset de password enviados
    // por correo. 'lax' es el valor correcto para este stack.
    // 'none' solo si necesitas embeds cross-origin (requiere secure: true).
  },
});
```

---

## 5. Mecanismos de seguridad

### 5.1 Hashing de contraseñas — Argon2id

```typescript
// src/auth/infrastructure/better-auth/argon2.config.ts
export const ARGON2_OPTIONS: argon2.Options = {
  type:        argon2.argon2id,
  memoryCost:  env.ARGON2_MEMORY_COST  ?? 65536,  // 64 MB
  timeCost:    env.ARGON2_TIME_COST    ?? 3,
  parallelism: env.ARGON2_PARALLELISM  ?? 4,
};
```

### 5.2 Historial de contraseñas

En `SignUpHook` y `ChangePasswordHook` (`@BeforeHook`):

1. Cargar las últimas `PASSWORD_HISTORY_DEPTH` entradas de `passwordHistory` para el usuario.
2. Verificar con `argon2.verify()` que el nuevo password no coincide con ninguna.
3. Si coincide: lanzar `DomainException('PASSWORD_REUSE')`.
4. Si no coincide: continuar y agregar la nueva entrada en `@AfterHook`.

### 5.3 Brute force (Redis counter)

```typescript
// src/auth/infrastructure/hooks/sign-in.hooks.ts
@BeforeHook(signIn.email)
async before(ctx) {
  const key      = `bf:${ctx.body.email.toLowerCase().trim()}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, env.BRUTE_FORCE_WINDOW_SECONDS);

  if (attempts > env.BRUTE_FORCE_MAX_ATTEMPTS) {
    await auditLog.log('ACCOUNT_LOCKED', {
      emailHash: sha256(ctx.body.email),
      ip:        ctx.request.ip,
    });
    throw new DomainException('ACCOUNT_LOCKED');
  }
}

@AfterHook(signIn.email)
async after(ctx) {
  // Resetear contador en login exitoso
  await redis.del(`bf:${ctx.context.user.email.toLowerCase().trim()}`);
  await auditLog.log('SIGN_IN', {
    userId:    ctx.context.user.id,
    email:     ctx.context.user.email,
    sessionId: ctx.context.session.id,
    ip:        ctx.request.ip,
  });
}
```

### 5.4 Inactivity timeout

```typescript
// src/auth/infrastructure/middleware/session-activity.middleware.ts
@Injectable()
export class SessionActivityMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = extractSessionId(req);
    if (!sessionId) return next();

    const lastActivity = await redis.get(`session:${sessionId}:activity`);

    if (!lastActivity) {
      res.clearCookie(COOKIE_NAME);
      return res.status(401).json({ code: 'SESSION_EXPIRED_INACTIVITY' });
    }

    // Renovar TTL en cada request activo
    await redis.set(
      `session:${sessionId}:activity`,
      Date.now(),
      'EX', env.SESSION_INACTIVITY_TIMEOUT_SECONDS,
    );

    next();
  }
}
```

**Exclusiones obligatorias del middleware:** `/api/v1/auth/*`, `/api/v1/public/*`.

### 5.5 Audit log sin PII

```typescript
// src/auth/application/audit-log.service.ts
export const AUDIT_EVENTS = {
  SIGN_UP:             'sign_up',
  SIGN_IN:             'sign_in',
  SIGN_OUT:            'sign_out',
  PASSWORD_RESET:      'password_reset',
  PASSWORD_CHANGE:     'password_change',
  EMAIL_CHANGE:        'email_change',
  TWO_FACTOR_ENABLED:  '2fa_enabled',
  TWO_FACTOR_DISABLED: '2fa_disabled',
  TWO_FACTOR_VERIFIED: '2fa_verified',
  ACCOUNT_LOCKED:      'account_locked',
  ROLE_ASSIGNED:       'role_assigned',
  ROLE_REVOKED:        'role_revoked',
} as const;

@Injectable()
export class AuditLogService {
  async log(
    event: keyof typeof AUDIT_EVENTS,
    data: {
      userId?:        string;
      email?:         string;   // se hashea antes de guardar
      ip?:            string;   // se hashea antes de guardar
      sessionId?:     string;
      correlationId?: string;
      metadata?:      Record<string, unknown>;
    },
  ) {
    await this.db.insert(authAuditLogTable).values({
      event:         AUDIT_EVENTS[event],
      userId:        data.userId,
      emailHash:     data.email ? sha256(data.email.toLowerCase().trim()) : null,
      ipHash:        data.ip    ? sha256(data.ip) : null,
      sessionId:     data.sessionId,
      correlationId: data.correlationId,
      metadata:      data.metadata ?? {},
    });
  }
}
```

> **Regla absoluta:** ningún campo de `auth_audit_log` contiene email, IP, nombre ni documento en texto plano. Solo hashes SHA256.

---

## 6. Manejo de errores de dominio

### `DomainException` — clase base

```typescript
// packages/utils/src/domain-exception.ts  (o src/shared/domain-exception.ts)
export class DomainException extends Error {
  constructor(
    readonly error: string,                    // código de error: 'AUTH_<SCREAMING_SNAKE>'
    readonly meta?: Record<string, unknown>,   // contexto opcional para logs, nunca expuesto al cliente
  ) {
    super(error);
    this.name = this.constructor.name;
  }
}
```

Cada excepción de dominio es una subclase que fija el código:

```typescript
// src/auth/domain/exceptions/password-reuse.exception.ts
export class PasswordReuseException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_PASSWORD_REUSE', meta);
  }
}
```

**Convención de nombres:** `AUTH_<SCREAMING_SNAKE>`. El prefijo `AUTH_` distingue los errores de este módulo de los de otros dominios de la app.

### `DomainExceptionFilter` — mapeo a HTTP

```typescript
// src/auth/infrastructure/filters/domain-exception.filter.ts
@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const status  = DomainToHttpMapper.map(exception.error);   // ver catálogo abajo
    const locale  = parseLocale(req.headers['accept-language']);
    const message = resolveMessage(catalog, exception.error, locale, fallback);

    // Status ≥ 500: el código real va a logs y Sentry, NUNCA al cliente
    const body = {
      success: false,
      code:    status,
      error:   status >= 500 ? 'INTERNAL_ERROR' : exception.error,
      message: status >= 500 ? httpMessages.INTERNAL_ERROR[locale] : message,
      data:    null,
    };

    res.status(status).json(body);
  }
}
```

Registrar en `app.module.ts` **después** de `HttpExceptionFilter` (outermost-first):

```typescript
{ provide: APP_FILTER, useClass: AllExceptionsFilter   },  // 1. captura todo
{ provide: APP_FILTER, useClass: HttpExceptionFilter   },  // 2. errores HTTP
{ provide: APP_FILTER, useClass: DomainExceptionFilter },  // 3. errores de dominio
```

### Catálogo de códigos de error

Todos los códigos válidos para este estándar. Agregar al `DomainToHttpMapper` y al catálogo i18n al implementar cada feature.

| Código | HTTP | Cuándo se lanza |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Contraseña incorrecta en sign-in o cambio de contraseña |
| `AUTH_ACCOUNT_LOCKED` | 429 | Brute force — superado `BRUTE_FORCE_MAX_ATTEMPTS` |
| `AUTH_PASSWORD_REUSE` | 422 | Nueva contraseña coincide con historial (últimas N) |
| `AUTH_PASSWORD_POLICY_FAILED` | 400 | No cumple complejidad mínima |
| `AUTH_NO_PASSWORD_ACCOUNT` | 400 | Usuario intentó cambiar password pero solo tiene cuenta social |
| `AUTH_SESSION_EXPIRED` | 401 | Redis inactivity key expiró — timeout de inactividad |
| `AUTH_SESSION_INVALIDATED` | 401 | `sessionInvalidBefore` violado — cambio de credenciales post-login |
| `AUTH_EMAIL_DELIVERY_FAILED` | 503 | Fallo al enviar email de verificación, reset o 2FA OTP |
| `AUTH_2FA_LOCKED` | 429 | Superado `OTP_MAX_ATTEMPTS` en verificación 2FA |
| `AUTH_2FA_OTP_RATE_LIMITED` | 429 | Superado rate limit de envío de OTP |
| `AUTH_2FA_TOTP_REPLAY` | 422 | Código TOTP ya usado (protección anti-replay) |
| `AUTH_ROLE_NOT_FOUND` | 404 | `AssignRoleUseCase` — `roleKey` no existe en catálogo |
| `AUTH_FORBIDDEN` | 403 | `AdminGuard` — usuario no tiene rol `super_admin` |
| `AUTH_USER_NOT_FOUND` | 404 | Operación admin sobre userId inexistente |
| `AUTH_SELF_ROLE_REVOKE` | 422 | `super_admin` intentó revocar su propio rol `super_admin` |
| `AUTH_OAUTH_CONTEXT_LOST` | 401 | Callback OAuth sin estado Redis — correlationId expiró o fue consumido |
| `AUTH_UNVERIFIED_SOCIAL_LINK_DENIED` | 403 | Usuario sin verificar con cuenta credential intentó linkear cuenta social |

> **Códigos fuera de scope** (solo para proyectos con multi-sistema): `AUTH_ACCESS_DENIED`, `AUTH_NOT_SYSTEM_ADMIN`, `AUTH_SYSTEM_NOT_FOUND`, `AUTH_SYSTEM_CONFLICT`, `AUTH_SYSTEM_INACTIVE`, `AUTH_MEMBER_NOT_FOUND`, `AUTH_CANNOT_REMOVE_OWNER`, `AUTH_INVALID_API_BASE_URL`, `AUTH_NOT_PLATFORM_ADMIN`, `AUTH_TERMS_NO_ACTIVE_VERSION`.

### Cómo agregar un nuevo código

1. Crear `src/auth/domain/exceptions/<name>.exception.ts` — subclase de `DomainException` con código `AUTH_<CODE>`
2. Agregar el código al union type `AuthErrorCode` en `src/auth/infrastructure/i18n/domain-messages.ts`
3. Agregar traducción `es` + `en` en `authDomainMessages`
4. Agregar mapeo HTTP en `DomainToHttpMapper.STATUS`
5. Lanzar la excepción desde el use case o hook correspondiente

---

## 8. Stack de Guards y Middleware

### Orden de registro en `AppModule`

```typescript
// app.module.ts
providers: [
  // Filters — outermost primero
  { provide: APP_FILTER, useClass: AllExceptionsFilter  },
  { provide: APP_FILTER, useClass: HttpExceptionFilter  },
  { provide: APP_FILTER, useClass: DomainExceptionFilter },

  // Guards — se ejecutan en orden de registro
  { provide: APP_GUARD, useClass: JwtAuthGuard      },  // 1. Valida JWT o cookie
  { provide: APP_GUARD, useClass: PermissionsGuard  },  // 2. Verifica @RequirePermissions
],
```

```typescript
// app.module.ts — configure()
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(CorrelationIdMiddleware)
    .forRoutes('*');

  consumer
    .apply(SessionActivityMiddleware)
    .exclude(
      { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
      { path: 'api/v1/public/(.*)', method: RequestMethod.ALL },
    )
    .forRoutes('*');
}
```

### `CorrelationIdMiddleware`

Función Express pura (no clase). Lee `x-correlation-id` del request entrante o genera un UUID nuevo, lo adjunta a `req.correlationId`, lo reenvía en los headers, y lo ecoa en la respuesta.

```typescript
// src/shared/middleware/correlation-id.middleware.ts
import { randomUUID } from 'node:crypto';

export function correlationIdMiddleware(
  req: { headers: Record<string, string | string[] | undefined>; correlationId?: string },
  res: { setHeader(name: string, value: string): void },
  next: () => void,
): void {
  const incoming = req.headers['x-correlation-id'];
  const fromHeader = Array.isArray(incoming) ? incoming[0] : incoming;
  const correlationId: string = fromHeader ?? randomUUID();

  req.correlationId = correlationId;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}
```

> Si el proyecto usa OpenTelemetry, propagar también como baggage:
> ```typescript
> import { context, propagation } from '@opentelemetry/api';
> // ... después de setear req.correlationId:
> const baggage = (propagation.getBaggage(context.active()) ?? propagation.createBaggage())
>   .setEntry('correlation.id', { value: correlationId });
> context.with(propagation.setBaggage(context.active(), baggage), next);
> ```

**Uso en logs y audit:** los hooks de Better-Auth reciben el `correlationId` via `ctx.request.headers['x-correlation-id']` o `ctx.context.correlationId` (si un hook anterior lo inyecta). Pasarlo siempre a `AuditLogService.log()`.

### `JwtAuthGuard` — doble modo (cookie + Bearer)

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get(IS_PUBLIC_KEY, context.getHandler())) return true;

    const req = context.switchToHttp().getRequest();

    // Modo 1: Session cookie (browser / SPA)
    const session = await auth.api.getSession({ headers: req.headers });
    if (session) {
      req.user = { sub: session.user.id, email: session.user.email };
      return true;
    }

    // Modo 2: Bearer JWT (API clients / mobile)
    const token = extractBearerToken(req);
    if (token) {
      const payload = await verifyJwt(token, {
        issuer:   env.API_BASE_URL,
        audience: env.API_BASE_URL,
        jwksUri:  `${env.API_BASE_URL}/api/v1/auth/.well-known/jwks.json`,
      });
      req.user = payload;
      return true;
    }

    throw new UnauthorizedException();
  }
}
```

### `PermissionsGuard`

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (!req.user) return true;

    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) return true;

    const resolved = await this.permissionResolver.resolve(req.user.sub);
    req.resolvedPermissions = resolved;

    return this.check(resolved, requirement);
  }

  private check(resolved: Set<string>, req: PermissionRequirement): boolean {
    const op = req.operator ?? 'AND';
    const check = (code: string) => resolved.has(code);
    return op === 'AND'
      ? req.permissions.every(check)
      : req.permissions.some(check);
  }
}
```

### `PermissionResolver`

```typescript
@Injectable()
export class PermissionResolver {
  async resolve(userId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ code: permission.code })
      .from(userRole)
      .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(and(
        eq(userRole.userId, userId),
        or(isNull(userRole.expiresAt), gt(userRole.expiresAt, new Date())),
      ));

    return new Set(rows.map(r => r.code));
  }

  async resolveRoles(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ key: role.key })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(and(
        eq(userRole.userId, userId),
        or(isNull(userRole.expiresAt), gt(userRole.expiresAt, new Date())),
      ));

    return rows.map(r => r.key);
  }
}
```

### `AdminGuard` — verificación de `super_admin`

Lee el claim `roles[]` del JWT que `JwtAuthGuard` ya dejó en `req.user`. Sin DB hit.

```typescript
// src/auth/infrastructure/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const roles: string[] = req.user?.roles ?? [];

    if (!roles.includes('super_admin')) {
      throw new ForbiddenException();
    }
    return true;
  }
}
```

**Condición necesaria:** `GetTokenUseCase` debe incluir los roles en el JWT al mintear:

```typescript
const token = await this.jwtMintService.mint({
  sub:           params.userId,
  email:         params.email,
  emailVerified: params.emailVerified,
  sid:           params.sessionId,
  roles,          // ← string[], e.g. ['super_admin'] o ['admin', 'editor']
});
```

**Semántica de revocación:** si se revoca el rol `super_admin` a un usuario, el guard lo seguirá aceptando hasta que su JWT de 15 min venza. Para revocación inmediata, llamar adicionalmente a `ForceRevokeSessionsUseCase(userId)` — destruye la sesión, el próximo `/auth/token` no minteará un JWT nuevo con ese rol.

> **Por qué no consultar la DB en `AdminGuard`:** `PermissionsGuard` ya hace un DB hit por request para los permisos. Agregar otro hit en `AdminGuard` duplicaría las consultas en cada request admin. Los roles en el JWT (TTL 15 min) son la fuente de verdad suficiente para este caso.

### `RolesController` — asignación y revocación de roles

Único punto de entrada HTTP para `AssignRoleUseCase` y `RevokeRoleUseCase`. Solo accesible por `super_admin`.

```typescript
// src/rbac/infrastructure/http/roles.controller.ts
@Controller('rbac/users/:userId/roles')
@UseGuards(AdminGuard)           // verifica claim super_admin en JWT — sin DB hit
export class RolesController {
  constructor(
    private readonly assignRole: AssignRoleUseCase,
    private readonly revokeRole: RevokeRoleUseCase,
  ) {}

  // POST /rbac/users/:userId/roles
  // Body: { roleKey: 'admin' | 'editor' | ... }
  @Post()
  async assign(
    @Param('userId') userId: string,
    @Body() body: AssignRoleDto,
    @CurrentUser() actor: JwtUser,
  ) {
    await this.assignRole.execute({
      targetUserId: userId,
      roleKey:      body.roleKey,
      grantedBy:    actor.sub,
      expiresAt:    body.expiresAt ?? null,   // null = permanente
    });
  }

  // DELETE /rbac/users/:userId/roles/:roleKey
  @Delete(':roleKey')
  async revoke(
    @Param('userId') userId: string,
    @Param('roleKey') roleKey: string,
    @CurrentUser() actor: JwtUser,
  ) {
    await this.revokeRole.execute({
      targetUserId: userId,
      roleKey,
      revokedBy: actor.sub,
    });
  }
}
```

**Contratos de los use cases:**

```typescript
// assign-role.use-case.ts
interface AssignRoleInput {
  targetUserId: string;
  roleKey:      string;       // debe existir en tabla role
  grantedBy:    string;       // userId del actor
  expiresAt:    Date | null;  // null = permanente
}
// Valida que roleKey exista. Lanza NotFoundException si no.
// Upsert en user_role (no duplica si ya existe).
// Audit log ROLE_ASSIGNED.

// revoke-role.use-case.ts
interface RevokeRoleInput {
  targetUserId: string;
  roleKey:      string;
  revokedBy:    string;
}
// Elimina la fila de user_role.
// No lanza error si no existía (idempotente).
// Audit log ROLE_REVOKED.
// No llama ForceRevokeSessionsUseCase — la revocación efectiva
// ocurre en ≤15 min (JWT TTL). Si se necesita inmediata, el
// caller debe invocar ForceRevokeSessionsUseCase por separado.
```

**Endpoints expuestos:**

| Método | Path | Guard | Descripción |
|---|---|---|---|
| `POST` | `/rbac/users/:userId/roles` | `AdminGuard` | Asignar rol a usuario |
| `DELETE` | `/rbac/users/:userId/roles/:roleKey` | `AdminGuard` | Revocar rol a usuario |

> `super_admin` no puede revocar su propio rol `super_admin` — validar `targetUserId !== actor.sub || roleKey !== 'super_admin'` en `RevokeRoleUseCase` para evitar lockout accidental.

---

## 9. Decoradores

```typescript
// Ruta pública — sin autenticación
@Public()
@Get('health')
health() {}

// Ruta autenticada, sin restricción de permisos
@Get('me')
getProfile(@CurrentUser() user: JwtUser) {}

// Permiso único
@RequirePermissions({ permissions: ['reports:read'] })
@Get('reports')
getReports() {}

// OR de permisos — cualquiera de los dos permite el acceso
@RequirePermissions({ permissions: ['invoices:write', 'invoices:admin'], operator: 'OR' })
@Post('invoices')
createInvoice() {}

// Inyectar permisos resueltos para lógica de filtrado en el controlador
@RequirePermissions({ permissions: ['users:read'] })
@Get('users')
getUsers(@CurrentPermissions() perms: Set<string>) {
  const canSeeAll = perms.has('users:admin');
  // filtrar resultados según perms
}
```

---

## 10. Flujos principales

### Sign-up (email/password)

```
POST /api/v1/auth/sign-up/email
  SignUpHook @BeforeHook
    → Validar captcha (si está habilitado)
    → Verificar email no en uso (normalizedEmail)
  Better-Auth
    → Hash Argon2id
    → Crear user + account rows
  user.create.before databaseHook
    → Computar normalizedEmail
  SignUpHook @AfterHook
    → Registrar en auth_audit_log (SIGN_UP)
  Better-Auth
    → Enviar email de verificación
← 201 { user }

  [Usuario hace clic en el link de verificación]
  emailVerification.after
    → Auto sign-in
    → Redirigir a CLIENT_URL/verified
```

### Sign-in (email/password)

```
POST /api/v1/auth/sign-in/email
  SignInHook @BeforeHook
    → Incrementar contador brute force en Redis
    → Si > MAX_ATTEMPTS: lanzar ACCOUNT_LOCKED + audit
  Better-Auth
    → Verificar hash, verificar email verificado
  session.create.before databaseHook
    → Eliminar sesión previa del userId (single-session)
  session.create.after databaseHook
    → Crear session:id:activity en Redis (TTL = INACTIVITY_TIMEOUT)
  SignInHook @AfterHook
    → Resetear contador brute force
    → Registrar SIGN_IN en audit_log
← 200 { user, session } | { twoFactorRedirect: true }
```

### JWT refresh — cómo el cliente obtiene un JWT fresco

El plugin `jwt()` de Better-Auth expone automáticamente:

```
POST /api/v1/auth/token
```

Este endpoint **siempre se autentica con la session** (cookie o session token), nunca con el JWT vencido. Retorna un JWT nuevo.

**Flujo browser/SPA (cookie automática):**
```
[JWT de 15 min vence]
  Cliente llama authClient.token()          ← jwtClient() plugin
    → POST /api/v1/auth/token (envía cookie)
      GetTokenUseCase
        → Verificar Redis inactivity key (session:{id}:activity)
        → Verificar sessionInvalidBefore (password/email change revoca sesiones)
        → PermissionResolver.resolve(userId) → roles del usuario
        → Mint JWT nuevo con ES256
        → Slide inactivity TTL en Redis
        → Audit log jwt_refresh_succeeded
← { token: "eyJ..." }
  Cliente actualiza accessToken signal
  Reintenta el request original con el nuevo JWT
```

**Flujo mobile / cliente API puro (sin browser):**

No existe un "refresh token" Bearer-to-Bearer. El session token de Better-Auth hace ese rol:

```
[Sign-in]
POST /api/v1/auth/sign-in/email
← 200 {
    user: { ... },
    session: { token: "sess_abc123...", expiresAt: "..." }  ← persisitir esto
  }
  + Set-Cookie: <session_httpOnly_cookie>   ← persisitir esto también si la plataforma lo permite

[JWT de 15 min vence]
POST /api/v1/auth/token
  Authorization: Bearer sess_abc123...      ← session token (no el JWT)
← { token: "eyJ..." }                       ← JWT fresco

[Session de 7 días vence o inactividad]
POST /api/v1/auth/sign-in/email             ← re-autenticar desde cero
```

**`GetTokenUseCase` (versión sin multi-sistema):**

```typescript
// src/auth/application/use-cases/get-token.use-case.ts
@Injectable()
export class GetTokenUseCase {
  async execute(params: {
    userId:           string;
    sessionId:        string;
    email:            string;
    emailVerified:    boolean;
    sessionCreatedAt: Date;
    correlationId?:   string;
  }): Promise<{ token: string }> {
    // 1. Inactivity check
    const active = await this.redis.get(`session:${params.sessionId}:activity`);
    if (!active) {
      await this.sessionRepo.deleteById(params.sessionId);
      await this.auditLog.log('SESSION_EXPIRED', { userId: params.userId });
      throw new SessionExpiredException();
    }

    // 2. sessionInvalidBefore check (password/email change revoca sesiones viejas)
    const session = await this.sessionRepo.findById(params.sessionId);
    if (!session) throw new SessionInvalidatedException();
    if (session.invalidBefore && params.sessionCreatedAt < session.invalidBefore) {
      await this.sessionRepo.deleteById(params.sessionId);
      throw new SessionInvalidatedException();
    }

    // 3. Resolver rol desde RBAC
    const roles = await this.permissionResolver.resolveRoles(params.userId);

    // 4. Mint JWT
    const token = await this.jwtMintService.mint({
      sub:           params.userId,
      email:         params.email,
      emailVerified: params.emailVerified,
      sid:           params.sessionId,
      roles,                               // claims de roles en el JWT
    });

    // 5. Slide inactivity TTL
    await this.redis.expire(
      `session:${params.sessionId}:activity`,
      env.SESSION_INACTIVITY_TIMEOUT_SECONDS,
    );

    // 6. Audit
    await this.auditLog.log('JWT_REFRESH', {
      userId:    params.userId,
      sessionId: params.sessionId,
    });

    return { token };
  }
}
```

> **Cuándo se invalida la sesión:** al cambiar contraseña o email, setear `session.invalidBefore = now()` en la tabla `session` del usuario. Esto fuerza a todos los clientes activos a re-autenticarse en el próximo refresh de JWT, sin necesidad de revocar cookies manualmente.

### Request autenticado (flujo normal)

```
GET /api/v1/reports
  CorrelationIdMiddleware        → agrega x-correlation-id
  SessionActivityMiddleware      → verifica Redis TTL, renueva si activo
  JwtAuthGuard
    → Modo cookie: auth.api.getSession() → req.user
    → Modo Bearer JWT: verifyJwt() con JWKS → req.user
  PermissionsGuard
    → PermissionResolver.resolve(req.user.sub) → Set<string>
    → Verificar @RequirePermissions({ permissions: ['reports:read'] })
  ReportsController.getReports()
← 200 { data: [...] }
```

**Interceptor del cliente (browser/SPA) para manejar JWT vencido:**

```typescript
// src/app/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const withToken = (token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(withToken(authService.accessToken())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      // JWT vencido → refrescar y reintentar una vez
      return from(authService.refreshAccessToken()).pipe(
        switchMap(() => next(withToken(authService.accessToken()))),
        catchError(() => {
          // Refresh falló (sesión vencida/inactiva) → logout
          authService.clearSession();
          inject(Router).navigate(['/auth/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
```

### Social OAuth (Google / provider)

El flujo tiene dos requests separados con estado en Redis entre ellos — no es un POST simple.

```
── Fase 1: iniciar OAuth ───────────────────────────────────────────────────
POST /api/v1/auth/sign-in/social
  Body: { provider: 'google', callbackURL: '/auth/callback', captchaToken }
  SocialSignInHook @BeforeHook
    → Validar captcha
    → Generar correlationId (UUID)
    → Guardar en Redis: oauth:ctx:{correlationId} → { correlationId }
      TTL: 10 min (ventana para completar el flujo OAuth)
  Better-Auth
    → Generar PKCE state (incluye correlationId)
    → Construir URL de autorización de Google
← 302 redirect → https://accounts.google.com/o/oauth2/auth?...&state=<pkce_state>

── Proveedor externo ────────────────────────────────────────────────────────
  Usuario autentica en Google
  Google redirige a: GET /api/v1/auth/callback/google?code=...&state=<pkce_state>

── Fase 2: callback ─────────────────────────────────────────────────────────
GET /api/v1/auth/callback/google?code=...&state=...
  SocialCallbackHook @BeforeHook
    → Inyectar oauthCtxStore en ctx para que databaseHooks lo usen
  Better-Auth
    → Validar PKCE state
    → Intercambiar code por token con Google
    → Obtener perfil del usuario (email, name, picture)
  account.create.before databaseHook  ← GUARD DE SEGURIDAD
    → Si el usuario ya existe (email match) Y está sin verificar Y tiene cuenta credential:
      lanzar error — previene bypass de verificación de email via social linking
    → Si el usuario no existe o está verificado: permitir
  account.create.after databaseHook
    → Si cuenta credential: agregar hash a passwordHistory
  session.create.before databaseHook
    → Revocar sesión previa del userId (single-session)
  session.create.after databaseHook
    → Seed Redis inactivity key
  SocialCallbackHook @AfterHook
    → Leer correlationId del PKCE state via getOAuthState()
    → Consumir Redis oauth:ctx:{correlationId} (fire-once)
    → Si correlationId no existe en Redis: lanzar AUTH_OAUTH_CONTEXT_LOST (401)
    → Mintear JWT con roles del usuario (igual que GetTokenUseCase)
    → Audit log SIGN_IN (loginMethod: 'google')
← 302 redirect → CLIENT_URL/auth/callback?...
  [cookie de sesión seteada en la respuesta]
```

**Tres piezas no obvias:**

**1. Estado OAuth en Redis** — el estado del contexto (correlationId) se guarda en Redis antes del redirect y se consume en el callback. Esto es necesario porque el callback llega en un request nuevo sin el body original. Sin Redis, no hay forma de correlacionar los dos requests.

```typescript
// src/auth/infrastructure/hooks/social-sign-in.hooks.ts
@BeforeHook('/sign-in/social')
async before(ctx: AuthHookContext): Promise<void> {
  await this.captchaService.verify(ctx.body.captchaToken);

  const correlationId = randomUUID();
  await this.redis.set(
    `oauth:ctx:${correlationId}`,
    JSON.stringify({ correlationId }),
    'EX', 600,   // 10 min — ventana para completar el flujo
  );
  ctx.context.correlationId = correlationId;
}

// src/auth/infrastructure/hooks/social-callback.hooks.ts
@AfterHook('/callback/:id')
async after(ctx: AuthHookContext): Promise<void> {
  const state = await getOAuthState();
  const correlationId = state?.correlationId;

  const ctxData = correlationId
    ? await this.redis.getdel(`oauth:ctx:${correlationId}`)
    : null;

  if (!ctxData) throw new APIError(401, { error: 'AUTH_OAUTH_CONTEXT_LOST' });

  // ... mintear JWT, audit log
}
```

**2. Guard de account linking** — en `account.create.before` databaseHook:

```typescript
account: {
  accountLinking: {
    enabled: true,
    trustedProviders: ['google'],  // email siempre verificado por Google
  },
},
databaseHooks: {
  account: {
    create: {
      before: async (account) => {
        // Solo aplica cuando Better-Auth intenta linkear una cuenta social
        // a un usuario existente
        if (!account.userId) return;

        const [user] = await db
          .select({ emailVerified: userTable.emailVerified })
          .from(userTable)
          .where(eq(userTable.id, account.userId));

        // Usuario verificado → permitir siempre
        if (!user || user.emailVerified) return;

        // Usuario sin verificar → denegar solo si ya tiene cuenta credential
        // (previene bypass: registrarse con email, no verificar, luego entrar por Google)
        const [credentialAccount] = await db
          .select({ id: accountTable.id })
          .from(accountTable)
          .where(and(
            eq(accountTable.userId, account.userId),
            eq(accountTable.providerId, 'credential'),
          ));

        if (credentialAccount) {
          throw new APIError(403, { error: 'AUTH_UNVERIFIED_SOCIAL_LINK_DENIED' });
        }
        // Sin cuenta credential → es primer login social, permitir
      },
    },
  },
},
```

**3. JWT minted en el callback** — a diferencia del email/password sign-in donde el JWT se minta en `GetTokenUseCase` vía `/auth/token`, el callback OAuth **minta el JWT directamente** en `SocialCallbackHook @AfterHook` y lo inyecta en la respuesta. El cliente lo recibe junto con el redirect y no necesita llamar `/auth/token` para obtener el primer JWT.

> **Por qué account linking solo deniega usuarios con cuenta credential sin verificar:** un usuario que solo tiene cuenta social (primer login con Google) nunca ha tenido email+password, por lo que no hay riesgo de bypass. El riesgo existe únicamente cuando alguien se registró con email+password y aún no verificó — en ese caso, permitir el login social crearía una cuenta activa que bypaseó la verificación de email.

### 2FA flow

```
[Login exitoso pero 2FA habilitado]
← 200 { twoFactorRedirect: true, twoFactorMethods: ['totp', 'email_otp'] }

  [Usuario elige método]
POST /api/v1/auth/two-factor/send-otp    ← solo si método = email_otp
  TwoFactorHook → rate limit por usuario
  Better-Auth → enviar OTP por email

POST /api/v1/auth/two-factor/verify-otp | /verify-totp
  TwoFactorHook → validar intentos
  Better-Auth → validar código
  session.create.before → revocar sesión previa
  session.create.after  → seed Redis inactivity
← 200 { user, session }
```

---

## 11. Variables de entorno (`.env.example`)

```bash
# ── App ──────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000
CLIENT_URL=http://localhost:4200
APP_NAME=MyApp
COOKIE_PREFIX=myapp

# ── Database ─────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# ── Redis ────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Better-Auth ──────────────────────────────────────────────
BETTER_AUTH_SECRET=           # openssl rand -base64 32 (min 32 chars)
BETTER_AUTH_URL=http://localhost:3000

# ── Argon2 ───────────────────────────────────────────────────
ARGON2_MEMORY_COST=65536      # 64 MB
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
PASSWORD_HISTORY_DEPTH=5
PASSWORD_RESET_TOKEN_TTL_SECONDS=3600

# ── Session ──────────────────────────────────────────────────
SESSION_INACTIVITY_TIMEOUT_SECONDS=1800  # 30 min

# ── Rate limiting ─────────────────────────────────────────────
SIGNUP_RATE_LIMIT_MAX=5        # por IP por hora
SIGNIN_RATE_LIMIT_MAX=10       # por IP por 15 min
RESET_RATE_LIMIT_MAX=3         # por IP por hora
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_GLOBAL_WINDOW_MS=60000

# ── Brute force ───────────────────────────────────────────────
BRUTE_FORCE_MAX_ATTEMPTS=5
BRUTE_FORCE_WINDOW_SECONDS=900 # 15 min

# ── Social OAuth ─────────────────────────────────────────────
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Email ────────────────────────────────────────────────────
EMAIL_FROM=no-reply@example.com
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=

# ── 2FA ──────────────────────────────────────────────────────
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5

# ── Captcha (Cloudflare Turnstile) ───────────────────────────
CAPTCHA_SECRET_KEY=
CAPTCHA_ENABLED=true
```

---

## 12. Qué aplica y qué no en este estándar

| Mecanismo | ¿Aplica? | Nota |
|---|---|---|
| HttpOnly cookie session | ✅ | Igual al modelo de referencia |
| ES256 JWT (15 min TTL) | ✅ | Audience = la misma API |
| Argon2id | ✅ | Con parámetros configurables |
| Historial de contraseñas | ✅ | Últimas N (default 5) |
| Verificación de email obligatoria | ✅ | No negociable |
| Brute force (Redis counter) | ✅ | Por email normalizado |
| Single-session por usuario | ✅ | Sin contexto de organización |
| Rate limiting multi-capa | ✅ | Better-Auth native + NestJS Throttler |
| Inactivity timeout | ✅ | Middleware en la misma app |
| Audit log sin PII | ✅ | Email e IP como SHA256 |
| 2FA (TOTP + OTP email) | ✅ | Plugin `twoFactor()` |
| Social OAuth + account linking | ✅ | Mismas reglas de seguridad |
| RBAC (roles + permisos) | ✅ | Sin contexto multi-tenant |
| JWKS endpoint público | ✅ | Servido automáticamente por Better-Auth |
| Multi-sistema / organizations | ❌ | Fuera de scope |
| System API keys (HMAC-SHA256) | ❌ | Fuera de scope |
| Orchestrator / API gateway | ❌ | No se necesita |
| `x-system-key` header | ❌ | Fuera de scope |
| Platform admin separado | ⚠️ | Reemplazado por rol `super_admin` |

---

## 13. Limitación conocida — JWT válido post-logout

### El problema

El JWT es stateless. Cuando un usuario hace sign-out, la sesión se destruye en el servidor y el cookie se borra, pero **un JWT Bearer capturado previamente sigue siendo válido hasta que expire** (máximo 15 minutos).

```
T=0   Usuario hace sign-out
        → sesión eliminada de DB
        → Redis inactivity key borrada
        → cookie limpiada en el browser

T=0   Atacante tiene JWT capturado antes del logout
T=14m Atacante usa el JWT → JwtAuthGuard lo acepta (firma válida, no expirado)
T=15m JWT expira → acceso bloqueado
```

Esto afecta **solo a clientes Bearer** (mobile, API). El browser no puede reusar el cookie después del logout porque fue borrado.

### Por qué es aceptado en el modelo base

- La ventana de exposición es fija en `≤ JWT_TTL` (15 min)
- Requiere que el atacante haya capturado el JWT antes del logout (MITM, leak de logs, XSS)
- Si hay XSS el problema mayor es el XSS, no el JWT
- La denylist tiene costo real: un Redis lookup sincrónico en **cada** request Bearer, eliminando el beneficio stateless del JWT

### Cuándo sí implementar la denylist

| Señal | Ejemplo |
|---|---|
| Sector regulado con requisito de revocación inmediata | Fintech, salud, gobierno |
| Tokens de larga duración (TTL > 15 min) | Si se sube el TTL por decisión de producto |
| Logout forzado por admin como control de seguridad crítico | "Revocar acceso ahora" en panel de seguridad |

### Implementación de la denylist (cuando se requiera)

**1. El JWT debe incluir un claim `jti` (JWT ID):**

```typescript
// En GetTokenUseCase, al mintear:
const token = await this.jwtMintService.mint({
  sub:   params.userId,
  email: params.email,
  sid:   params.sessionId,
  roles,
  jti:   randomUUID(),       // ← agregar
});
```

**2. En `SignOutUseCase`, registrar el `jti` en Redis con el TTL restante:**

```typescript
// src/auth/application/use-cases/sign-out.use-case.ts
async execute(params: { jti: string; jwtExpiresAt: Date }): Promise<void> {
  const remainingTtl = Math.ceil(
    (params.jwtExpiresAt.getTime() - Date.now()) / 1000,
  );

  if (remainingTtl > 0) {
    // La key expira sola — no necesita limpieza manual
    await this.redis.set(`jwt:revoked:${params.jti}`, '1', 'EX', remainingTtl);
  }

  // ... resto del sign-out (borrar sesión, limpiar Redis inactivity key)
}
```

**3. En `JwtAuthGuard`, verificar la denylist antes de aceptar el token:**

```typescript
// Solo para el modo Bearer — los clientes cookie no tienen este problema
if (token) {
  const payload = await verifyJwt(token, jwksOptions);

  if (payload.jti) {
    const revoked = await redis.exists(`jwt:revoked:${payload.jti}`);
    if (revoked) throw new UnauthorizedException('TOKEN_REVOKED');
  }

  req.user = payload;
  return true;
}
```

> **Costo:** un `redis.exists()` por cada request Bearer. En alta concurrencia, evaluar una caché local en memoria (LRU, TTL corto) para amortiguar el hit a Redis — pero solo si los benchmarks lo justifican.

---

## 14. Modelo de inactividad — qué cuenta como actividad y qué no

### Definición de "actividad"

El inactivity timer solo se renueva en **llamadas reales de API** — requests HTTP que pasan por `SessionActivityMiddleware`. No se renueva en verificaciones de estado de sesión.

```
Tipo de llamada                          ¿Renueva Redis TTL?
────────────────────────────────────────────────────────────
GET /api/reports                         ✅ siempre
POST /api/invoices                       ✅ siempre
authClient.getSession() [dentro 5 min]   ❌ cookie cache — no hay HTTP
authClient.getSession() [después 5 min]  ✅ hace HTTP → middleware corre
authClient.token()                       ✅ hace HTTP → ver GetTokenUseCase
```

### Tolerancia conocida

El timeout efectivo en el caso extremo es:

```
inactivity timeout real = SESSION_INACTIVITY_TIMEOUT_SECONDS + cookieCache.maxAge
                        = 1800s + 300s = 35 min (máximo teórico)
```

Este caso extremo ocurre solo cuando el SPA únicamente llama `getSession()` y el usuario no hace ninguna llamada de API durante todo ese período. En uso normal esto no ocurre.

### Cuándo cambiar `cookieCache.maxAge`

| Necesidad | Configuración |
|---|---|
| Comportamiento por defecto — tolerancia de 5 min aceptable | `maxAge: 60 * 5` |
| Compliance estricto — timeout exacto | `maxAge: 0` (o `enabled: false`) |
| Intermedio — reducir tolerancia | `maxAge: 60` (1 min) |

> **Anti-patrón a evitar:** deshabilitar `cookieCache` para "arreglar" la tolerancia sin entender la consecuencia. Si se deshabilita, cada llamada `getSession()` del SPA (incluyendo polls en background) haría HTTP y renovaría el timer, haciendo que usuarios realmente idle nunca sean deslogueados.

### Qué NO renenueva el timer (por diseño)

- Polls de `authClient.getSession()` dentro del `cookieCache.maxAge`
- Llamadas a `/api/v1/auth/*` (excluidas explícitamente del middleware)
- Llamadas a rutas `@Public()` (no pasan por los guards, pero SÍ pasan por el middleware — excluirlas si se necesita)

---

## 15. Checklist de verificación pre-producción

### Seguridad base

- [ ] `BETTER_AUTH_SECRET` generado con `openssl rand -base64 32` (min 32 chars)
- [ ] `requireEmailVerification: true` en la config
- [ ] Argon2id con `memoryCost >= 65536`
- [ ] `PASSWORD_HISTORY_DEPTH >= 5`
- [ ] Brute force guard activo y testeado
- [ ] Rate limits activos en sign-up, sign-in y reset-password
- [ ] `useSecureCookies: env.NODE_ENV === 'production'` en `advanced` — activa el flag `Secure` en producción
- [ ] `sameSite` **no sobreescrito** — confiar en el default `lax` de Better-Auth; `strict` rompe OAuth callbacks y links de email

### Sesión

- [ ] Single-session activo (hook `session.create.before` borra sesiones previas del userId)
- [ ] `SessionActivityMiddleware` activo y excluye correctamente `/auth/*` y `/public/*`
- [ ] Redis disponible y conectado (rate limit + brute force + inactivity)
- [ ] `cookieCache.maxAge` documentado y su tolerancia aceptada por el equipo de producto (ver §11)
- [ ] Si el producto requiere compliance estricto: `cookieCache: { enabled: false }` o `maxAge: 0`

### RBAC

- [ ] Migración `CREATE UNIQUE INDEX user_normalized_email_unique ON "user" (normalized_email)` aplicada después del primer `db:migrate` de Better-Auth (ver §3.3)
- [ ] Seed de roles `super_admin`, `admin`, `viewer` en migración inicial
- [ ] Seed del catálogo de permisos completo antes del primer deploy
- [ ] `PermissionsGuard` registrado como `APP_GUARD` después de `JwtAuthGuard`
- [ ] `PermissionResolver` hace query con filtro de `expires_at`

### Audit log

- [ ] Todos los hooks de auth llaman a `AuditLogService`
- [ ] Ningún campo del log contiene email, IP o nombre en texto plano
- [ ] Índice en `(user_id, created_at DESC)` y `(event, created_at DESC)` creado

### JWT y token refresh

- [ ] `audience` = `API_BASE_URL` (la misma app, no una URL externa)
- [ ] `JwtAuthGuard` valida `issuer` + `audience` en tokens Bearer
- [ ] JWKS endpoint (`/api/v1/auth/.well-known/jwks.json`) marcado como `@Public()`
- [ ] Token TTL = 15 minutos (no aumentar sin justificación — cada minuto extra amplía la ventana post-logout)
- [ ] Decisión documentada sobre denylist JWT: ¿sector regulado o logout forzado requerido? → implementar §13; si no → aceptar limitación de 15 min y documentarlo
- [ ] `disableSettingJwtHeader: true` en config del plugin `jwt()` — el JWT se obtiene solo vía `/auth/token`, nunca automáticamente en `/get-session`
- [ ] `GetTokenUseCase` verifica Redis inactivity key antes de mintear JWT
- [ ] `GetTokenUseCase` verifica `session.invalidBefore` — se setea al cambiar contraseña o email
- [ ] Interceptor del cliente reintenta con JWT fresco en 401, luego hace logout en segundo 401
- [ ] Clientes mobile documentados para persistir `session.token` de la respuesta de sign-in

### 2FA

- [ ] `OTP_MAX_ATTEMPTS` configurado y el hook lo respeta
- [ ] Rate limit de envío de OTP activo (no enviar ilimitadamente)
- [ ] Backup codes generados en enrollment de TOTP
