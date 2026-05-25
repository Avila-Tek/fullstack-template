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
│   │   │   ├── sign-out.hooks.ts
│   │   │   ├── social-sign-in.hooks.ts   ← @BeforeHook /sign-in/social: captcha + Redis state
│   │   │   ├── social-callback.hooks.ts  ← @BeforeHook+@AfterHook /callback/:id: JWT mint + audit
│   │   │   ├── two-factor.hooks.ts
│   │   │   └── email-verification.hooks.ts
│   │   │   # device.hooks.ts — fuera del scope base (ver nota al pie de §2)
│   │   ├── guards/
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
│   │   ├── drizzle-role.repository.ts
│   │   └── http/
│   │       └── roles.controller.ts   ← POST/DELETE /rbac/users/:userId/roles, solo super_admin
│   └── application/
│       ├── permission-resolver.service.ts  ← resuelve perms en runtime
│       └── use-cases/
│           ├── assign-role.use-case.ts
│           └── revoke-role.use-case.ts
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
| `user` | Usuarios de la plataforma. Columnas clave: `normalizedEmail`, `twoFactorEnabled` |
| `session` | Sesiones activas (7 días TTL, sliding window) |
| `account` | Cuentas vinculadas por proveedor (`credential`, `google`, etc.) |
| `verification` | Tokens de verificación de email |
| `twoFactor` | Secretos TOTP y backup codes |
| `jwks` | Par de llaves EC para firmar/verificar JWTs |
| `rateLimit` | Contadores de rate limit (Redis en producción) |

### 3.2 Tablas custom de auth

Estas tablas **no las crea Better-Auth** — deben gestionarse con las migraciones del proyecto.

#### `passwordHistory`

```sql
CREATE TABLE password_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT        NOT NULL,   -- Better-Auth user.id (TEXT, no UUID)
  hashed_password TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON password_history (user_id, created_at DESC);
```

En Drizzle:

```typescript
// src/auth/infrastructure/database/password-history.schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const passwordHistory = pgTable('password_history', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         text('user_id').notNull(),
  hashedPassword: text('hashed_password').notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

> **Por qué no en Better-Auth:** Better-Auth no gestiona historial de contraseñas nativamente.
> Los hooks `account.create.after` y `account.update.after` son los puntos donde se escribe
> la nueva entrada y se poda el historial a las últimas `PASSWORD_HISTORY_DEPTH` entradas.

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
    './src/auth/infrastructure/database/password-history.schema.ts',
    './src/rbac/infrastructure/persistence/*.schema.ts',
  ],
  // ...
});
```

> **Por qué no basta con la validación en el hook:** el `SignUpHook` consulta `normalizedEmail` antes de crear el usuario, pero sin el índice hay una ventana de race condition en registros concurrentes. El índice es la garantía a nivel de base de datos.

### 3.4 Tablas de RBAC

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
  code        VARCHAR(128) NOT NULL UNIQUE,  -- 'users:read', 'users:create'
  resource    VARCHAR(64)  NOT NULL,         -- 'users', 'reports', 'invoices'
  action      VARCHAR(32)  NOT NULL,         -- 'create', 'read', 'update', 'delete'
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

### 3.5 Convención de códigos de permisos

```
{resource}:{action}
```

Acciones estándar: `create`, `read`, `update`, `delete`. Agregar `admin` solo cuando se necesite acceso irrestricto a un recurso (e.g., `settings:admin`).

| Código | Descripción |
|---|---|
| `users:create` | Crear usuarios |
| `users:read` | Ver listado y detalle de usuarios |
| `users:update` | Editar usuarios |
| `users:delete` | Eliminar usuarios |

### 3.6 Roles y permisos predefinidos (seed obligatorio)

**Roles:**

| key | `is_system` | Descripción |
|---|---|---|
| `super_admin` | true | Todos los permisos. No editable ni eliminable. |
| `admin` | true | Permisos operativos completos, sin permisos de sistema. |
| `viewer` | false | Solo lectura en todos los recursos. |

**Permisos del módulo `users` (seed base del template):**

```typescript
// seed/permissions.ts
export const BASE_PERMISSIONS = [
  { code: 'users:create', resource: 'users', action: 'create', description: 'Crear usuarios' },
  { code: 'users:read',   resource: 'users', action: 'read',   description: 'Ver usuarios' },
  { code: 'users:update', resource: 'users', action: 'update', description: 'Editar usuarios' },
  { code: 'users:delete', resource: 'users', action: 'delete', description: 'Eliminar usuarios' },
] as const;

// Asignación inicial: super_admin y admin reciben todos los permisos del módulo users.
// viewer no recibe ninguno por defecto — asignar manualmente según el producto.
```

> Cada proyecto extiende este catálogo con los permisos de sus propios módulos de negocio
> siguiendo la convención `{resource}:{action}`.

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
    // S-008: token TTL para links /reset-password (default 1 hora)
    resetPasswordTokenExpiresIn: env.PASSWORD_RESET_TOKEN_TTL_SECONDS,
  },

  // ── Email Verification ───────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.sendVerification(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    callbackURL: `${env.CLIENT_URL}/auth/verify-email?verified=1`,
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

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],  // email siempre verificado por Google
    },
  },

  // ── Plugins ──────────────────────────────────────────────
  plugins: [
    jwt({
      jwks: {
        keyPairConfig: { alg: 'ES256' },
        jwksPath: '/.well-known/jwks.json',
      },
      jwt: {
        issuer:         env.API_BASE_URL,
        audience:       env.API_BASE_URL,     // misma app — sin orchestrator externo
        expirationTime: '15m',
        // Suppress BA's generic set-auth-jwt header on /get-session responses.
        // Clients must call /token explicitly to get a JWT.
        disableSettingJwtHeader: true,
        definePayload: ({ user, session }) => ({
          email:         user.email,
          emailVerified: user.emailVerified,
          sid:           session.id,
          // roles se inyectan en GetTokenUseCase — no disponibles aquí sin DB hit
        }),
      },
    }),
    twoFactor({
      issuer: env.APP_NAME,
      otpOptions: {
        period:          env.OTP_TTL_SECONDS,
        digits:          6,
        storeOTP:        'hashed',
        allowedAttempts: env.OTP_MAX_ATTEMPTS,
        sendOTP: async ({ user, otp }) => emailService.send2faOtp(user.email, otp),
      },
      backupCodeOptions: { amount: 8, length: 10 },
    }),
  ],

  // ── Rate limiting ─────────────────────────────────────────
  rateLimit: {
    enabled: true,
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
            twoFactorEnabled: false,
          },
        }),
      },
      update: {
        before: async (data) => {
          if (data.email) {
            return { data: { ...data, normalizedEmail: data.email.toLowerCase().trim() } };
          }
          return { data };
        },
      },
    },
    account: {
      create: {
        // Guard de seguridad: previene bypass de verificación via social linking
        before: async (account) => {
          if (!account.userId) return;
          const [user] = await db
            .select({ emailVerified: userTable.emailVerified })
            .from(userTable)
            .where(eq(userTable.id, account.userId));
          if (!user || user.emailVerified) return;
          const [credentialAccount] = await db
            .select({ id: accountTable.id })
            .from(accountTable)
            .where(and(
              eq(accountTable.userId, account.userId),
              eq(accountTable.providerId, 'credential'),
            ));
          if (credentialAccount) return false; // denegar social link a usuario sin verificar
        },
        after: async (account) => {
          if (account.providerId === 'credential' && account.password) {
            await appendPasswordHistory(account.userId, account.password);
          }
        },
      },
      update: {
        after: async (account) => {
          // Fires on password reset
          if (account.providerId !== 'credential' || !account.password) return;
          await appendPasswordHistory(account.userId, account.password);
        },
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

En `SignUpHook` (`@BeforeHook`):

1. Cargar las últimas `PASSWORD_HISTORY_DEPTH` entradas de `password_history` para el usuario.
2. Verificar con `argon2.verify()` que el nuevo password no coincide con ninguna.
3. Si coincide: lanzar `PasswordReuseException`.
4. Si no coincide: continuar.

En `@AfterHook` (sign-up) y `account.update.after` (password reset): agregar la nueva entrada y podar el historial a las últimas `PASSWORD_HISTORY_DEPTH` entradas.

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
    throw new AccountLockedException();
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
      return res.status(401).json({ code: 'AUTH_SESSION_EXPIRED' });
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
  EMAIL_CHANGE:        'email_change',
  TWO_FACTOR_ENABLED:  '2fa_enabled',
  TWO_FACTOR_DISABLED: '2fa_disabled',
  TWO_FACTOR_VERIFIED: '2fa_verified',
  ACCOUNT_LOCKED:      'account_locked',
  ROLE_ASSIGNED:       'role_assigned',
  ROLE_REVOKED:        'role_revoked',
  JWT_REFRESH:         'jwt_refresh',
  SESSION_EXPIRED:     'session_expired',
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
    const status  = DomainToHttpMapper.map(exception.error);
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

Registrar en `app.module.ts` **outermost-first**:

```typescript
{ provide: APP_FILTER, useClass: AllExceptionsFilter   },  // 1. captura todo
{ provide: APP_FILTER, useClass: HttpExceptionFilter   },  // 2. errores HTTP
{ provide: APP_FILTER, useClass: DomainExceptionFilter },  // 3. errores de dominio
```

### Catálogo de códigos de error

| Código | HTTP | Cuándo se lanza |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 401 | Contraseña incorrecta en sign-in |
| `AUTH_ACCOUNT_LOCKED` | 429 | Brute force — superado `BRUTE_FORCE_MAX_ATTEMPTS` |
| `AUTH_PASSWORD_REUSE` | 422 | Nueva contraseña coincide con historial (últimas N) |
| `AUTH_PASSWORD_POLICY_FAILED` | 400 | No cumple complejidad mínima |
| `AUTH_SESSION_EXPIRED` | 401 | Redis inactivity key expiró |
| `AUTH_SESSION_INVALIDATED` | 401 | `sessionInvalidBefore` violado |
| `AUTH_EMAIL_DELIVERY_FAILED` | 503 | Fallo al enviar email de verificación, reset o 2FA OTP |
| `AUTH_2FA_LOCKED` | 429 | Superado `OTP_MAX_ATTEMPTS` en verificación 2FA |
| `AUTH_2FA_OTP_RATE_LIMITED` | 429 | Superado rate limit de envío de OTP |
| `AUTH_2FA_TOTP_REPLAY` | 422 | Código TOTP ya usado (protección anti-replay) |
| `AUTH_ROLE_NOT_FOUND` | 404 | `AssignRoleUseCase` — `roleKey` no existe en catálogo |
| `AUTH_FORBIDDEN` | 403 | `AdminGuard` — usuario no tiene rol `super_admin` |
| `AUTH_USER_NOT_FOUND` | 404 | Operación admin sobre userId inexistente |
| `AUTH_SELF_ROLE_REVOKE` | 422 | `super_admin` intentó revocar su propio rol `super_admin` |
| `AUTH_OAUTH_CONTEXT_LOST` | 401 | Callback OAuth sin estado Redis — correlationId expiró |
| `AUTH_UNVERIFIED_SOCIAL_LINK_DENIED` | 403 | Usuario sin verificar con cuenta credential intentó linkear cuenta social |

> **Códigos fuera de scope** (solo para proyectos con multi-sistema): `AUTH_ACCESS_DENIED`,
> `AUTH_NOT_SYSTEM_ADMIN`, `AUTH_SYSTEM_NOT_FOUND`, `AUTH_NOT_PLATFORM_ADMIN`.

### Cómo agregar un nuevo código

1. Crear `src/auth/domain/exceptions/<name>.exception.ts` — subclase de `DomainException` con código `AUTH_<CODE>`
2. Agregar el código al union type `AuthErrorCode` en `src/auth/infrastructure/i18n/domain-messages.ts`
3. Agregar traducción `es` + `en` en `authDomainMessages`
4. Agregar mapeo HTTP en `DomainToHttpMapper.STATUS`
5. Lanzar la excepción desde el use case o hook correspondiente

---

## 7. Tipos compartidos

```typescript
// src/shared/guards/jwt-user.interface.ts

/**
 * Payload de req.user disponible en cualquier controlador autenticado.
 * Modo cookie: sub + email + emailVerified son suficientes (session ya verificada).
 * Modo Bearer: incluye además sid y roles (del JWT minteado por GetTokenUseCase).
 */
export interface JwtUser {
  sub:           string;    // userId — usado por PermissionsGuard y AdminGuard
  email:         string;
  emailVerified: boolean;
  sid:           string;    // sessionId — útil para audit log y revocación
  roles:         string[];  // e.g. ['admin', 'viewer'] — incluidos al mintear JWT
}

/**
 * Argumento de @RequirePermissions().
 * operator: 'AND' (default) — todos los permisos requeridos.
 * operator: 'OR'  — basta con que el usuario tenga al menos uno.
 */
export interface PermissionRequirement {
  permissions: string[];
  operator?:   'AND' | 'OR';
}
```

> **Nota sobre modo cookie vs Bearer:** en modo cookie, `JwtAuthGuard` obtiene la sesión
> de Better-Auth y solo tiene `sub` + `email` + `emailVerified`. Los campos `sid` y `roles`
> se completan en modo Bearer (JWT). Los controladores que necesiten `roles` deben usar el
> modo Bearer o consultar `PermissionResolver` directamente. En la práctica, los endpoints
> admin siempre usan Bearer.

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
> const baggage = (propagation.getBaggage(context.active()) ?? propagation.createBaggage())
>   .setEntry('correlation.id', { value: correlationId });
> context.with(propagation.setBaggage(context.active(), baggage), next);
> ```

**Uso en logs y audit:** los hooks de Better-Auth reciben el `correlationId` via `ctx.request.headers['x-correlation-id']`. Pasarlo siempre a `AuditLogService.log()`.

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
      req.user = {
        sub:           session.user.id,
        email:         session.user.email,
        emailVerified: session.user.emailVerified,
        sid:           session.session.id,
        roles:         [],  // roles no disponibles en cookie mode — usar PermissionsGuard
      } satisfies JwtUser;
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
      req.user = payload as JwtUser;
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

**Semántica de revocación:** si se revoca el rol `super_admin`, el guard lo seguirá aceptando hasta que el JWT de 15 min venza. Para revocación inmediata, llamar adicionalmente a `ForceRevokeSessionsUseCase(userId)`.

### `RolesController` — asignación y revocación de roles

```typescript
// src/rbac/infrastructure/http/roles.controller.ts
@Controller('rbac/users/:userId/roles')
@UseGuards(AdminGuard)
export class RolesController {
  constructor(
    private readonly assignRole: AssignRoleUseCase,
    private readonly revokeRole: RevokeRoleUseCase,
  ) {}

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
      expiresAt:    body.expiresAt ?? null,
    });
  }

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

**Contratos:**

```typescript
interface AssignRoleInput {
  targetUserId: string;
  roleKey:      string;       // debe existir en tabla role
  grantedBy:    string;
  expiresAt:    Date | null;  // null = permanente
}
// Valida que roleKey exista. Lanza AUTH_ROLE_NOT_FOUND si no.
// Upsert en user_role (no duplica si ya existe).
// Audit log ROLE_ASSIGNED.

interface RevokeRoleInput {
  targetUserId: string;
  roleKey:      string;
  revokedBy:    string;
}
// Elimina la fila de user_role. Idempotente.
// Audit log ROLE_REVOKED.
// No llama ForceRevokeSessionsUseCase — revocación efectiva en ≤15 min (JWT TTL).
```

| Método | Path | Guard | Descripción |
|---|---|---|---|
| `POST` | `/rbac/users/:userId/roles` | `AdminGuard` | Asignar rol |
| `DELETE` | `/rbac/users/:userId/roles/:roleKey` | `AdminGuard` | Revocar rol |

> `super_admin` no puede revocar su propio rol `super_admin` — validar
> `targetUserId !== actor.sub || roleKey !== 'super_admin'` en `RevokeRoleUseCase`.

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
    → Verificar historial de contraseñas
  Better-Auth
    → Hash Argon2id
    → Crear user + account rows
  user.create.before databaseHook
    → Computar normalizedEmail
  account.create.after databaseHook
    → Agregar hash a passwordHistory
  SignUpHook @AfterHook
    → Registrar en auth_audit_log (SIGN_UP)
  Better-Auth
    → Enviar email de verificación
← 201 { user }

  [Usuario hace clic en el link de verificación]
  emailVerification.after
    → Auto sign-in
    → Redirigir a CLIENT_URL/auth/verify-email?verified=1
```

### Sign-in (email/password)

```
POST /api/v1/auth/sign-in/email
  SignInHook @BeforeHook
    → Incrementar contador brute force en Redis
    → Si > MAX_ATTEMPTS: lanzar AUTH_ACCOUNT_LOCKED + audit
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

### Sign-out

```
POST /api/v1/auth/sign-out
  SignOutHook @BeforeHook
    → Leer sessionId del request (cookie o Bearer)
  Better-Auth
    → Eliminar sesión de la DB
    → Limpiar cookie de sesión en el browser
  SignOutHook @AfterHook
    → Eliminar Redis key session:{id}:activity   ← cleanup explícito
    → Registrar SIGN_OUT en audit_log
← 200 { success: true }
```

> **Por qué el cleanup de Redis es explícito:** Better-Auth elimina la fila de sesión de la DB,
> pero no tiene conocimiento del Redis key de inactividad. Sin este paso, el key queda huérfano
> hasta que su TTL expire naturalmente (máximo `SESSION_INACTIVITY_TIMEOUT_SECONDS`).

### Password reset

```
── Fase 1: solicitar reset ──────────────────────────────────────────────────
POST /api/v1/auth/forget-password
  ForgetPasswordHook @BeforeHook
    → Rate limit por IP (RESET_RATE_LIMIT_MAX)
  Better-Auth
    → Generar token de reset (TTL = PASSWORD_RESET_TOKEN_TTL_SECONDS)
    → Guardar token hasheado en tabla verification
    → Enviar email con link: CLIENT_URL/auth/reset-password?token=<token>
← 200 { success: true }   ← respuesta idéntica si email no existe (evita user enumeration)

── Fase 2: validar token ────────────────────────────────────────────────────
GET /api/v1/auth/reset-password?token=<token>
  Better-Auth
    → Verificar token en tabla verification
    → Verificar que no haya expirado (PASSWORD_RESET_TOKEN_TTL_SECONDS)
← 200 { valid: true } | 400 { error: 'INVALID_OR_EXPIRED_TOKEN' }

── Fase 3: establecer nueva contraseña ──────────────────────────────────────
POST /api/v1/auth/reset-password
  Body: { token: string, newPassword: string }
  ResetPasswordHook @BeforeHook
    → Verificar token (misma validación que fase 2)
    → Verificar complejidad del nuevo password
    → Verificar historial de contraseñas (últimas PASSWORD_HISTORY_DEPTH)
    → Si reutilizado: lanzar AUTH_PASSWORD_REUSE
  Better-Auth
    → Hash Argon2id del nuevo password
    → Actualizar account.password
    → Invalidar token de reset
  account.update.after databaseHook
    → Agregar nuevo hash a passwordHistory
  ResetPasswordHook @AfterHook
    → Setear session.invalidBefore = now() para el usuario
      (fuerza re-autenticación en el próximo /auth/token)
    → Registrar PASSWORD_RESET en audit_log
← 200 { success: true }
```

### JWT refresh — cómo el cliente obtiene un JWT fresco

El plugin `jwt()` de Better-Auth expone automáticamente `POST /api/v1/auth/token`.
Este endpoint **siempre se autentica con la session** (cookie o session token), nunca con el JWT vencido.

**Flujo browser/SPA:**

```
[JWT de 15 min vence]
  Cliente llama authClient.token()
    → POST /api/v1/auth/token (envía cookie)
      TokenHook @BeforeHook
        → GetTokenUseCase.execute()
          → Verificar Redis session:{id}:activity
          → Verificar session.invalidBefore
          → PermissionResolver.resolveRoles(userId) → roles
          → Mint JWT nuevo con ES256 (sub, email, emailVerified, sid, roles)
          → Slide inactivity TTL en Redis
          → Audit log JWT_REFRESH
← { token: "eyJ..." }
  Cliente actualiza accessToken en memoria
  Reintenta el request original con el nuevo JWT
```

**Flujo mobile / cliente API puro:**

```
[Sign-in]
POST /api/v1/auth/sign-in/email
← 200 { user, session: { token: "sess_abc123...", expiresAt: "..." } }

[JWT de 15 min vence]
POST /api/v1/auth/token
  Authorization: Bearer sess_abc123...   ← session token (no el JWT)
← { token: "eyJ..." }                    ← JWT fresco

[Session de 7 días vence o inactividad]
POST /api/v1/auth/sign-in/email          ← re-autenticar desde cero
```

**`GetTokenUseCase`:**

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

    // 2. sessionInvalidBefore check
    const session = await this.sessionRepo.findById(params.sessionId);
    if (!session) throw new SessionInvalidatedException();
    if (session.invalidBefore && params.sessionCreatedAt < session.invalidBefore) {
      await this.sessionRepo.deleteById(params.sessionId);
      throw new SessionInvalidatedException();
    }

    // 3. Resolver roles desde RBAC
    const roles = await this.permissionResolver.resolveRoles(params.userId);

    // 4. Mint JWT
    const token = await this.jwtMintService.mint({
      sub:           params.userId,
      email:         params.email,
      emailVerified: params.emailVerified,
      sid:           params.sessionId,
      roles,
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

> **`session.invalidBefore`:** al hacer password reset o email change, setear
> `session.invalidBefore = now()`. Esto fuerza a todos los clientes activos a
> re-autenticarse en el próximo `/auth/token`, sin revocar cookies manualmente.

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

      return from(authService.refreshAccessToken()).pipe(
        switchMap(() => next(withToken(authService.accessToken()))),
        catchError(() => {
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

```
── Fase 1: iniciar OAuth ───────────────────────────────────────────────────
POST /api/v1/auth/sign-in/social
  Body: { provider: 'google', callbackURL: '/auth/callback', captchaToken }
  SocialSignInHook @BeforeHook
    → Validar captcha
    → Generar correlationId (UUID)
    → Guardar en Redis: oauth:ctx:{correlationId} → { correlationId }  TTL: 10 min
  Better-Auth
    → Generar PKCE state (incluye correlationId)
    → Construir URL de autorización de Google
← 302 redirect → https://accounts.google.com/o/oauth2/auth?...&state=<pkce_state>

── Proveedor externo ────────────────────────────────────────────────────────
  Usuario autentica en Google
  Google redirige a: GET /api/v1/auth/callback/google?code=...&state=<pkce_state>

── Fase 2: callback ─────────────────────────────────────────────────────────
GET /api/v1/auth/callback/google?code=...&state=...
  Better-Auth
    → Validar PKCE state
    → Intercambiar code por token con Google
    → Obtener perfil del usuario (email, name)
  account.create.before databaseHook
    → Si usuario sin verificar + tiene cuenta credential: lanzar AUTH_UNVERIFIED_SOCIAL_LINK_DENIED
    → Si usuario no existe o está verificado: permitir
  session.create.before databaseHook
    → Revocar sesión previa del userId (single-session)
  session.create.after databaseHook
    → Seed Redis inactivity key
  SocialCallbackHook @AfterHook
    → Leer correlationId del PKCE state via getOAuthState()
    → Consumir Redis oauth:ctx:{correlationId} (fire-once)
    → Si correlationId no existe en Redis: lanzar AUTH_OAUTH_CONTEXT_LOST
    → Mintear JWT con roles del usuario
    → Audit log SIGN_IN (loginMethod: 'google')
← 302 redirect → CLIENT_URL/auth/callback?...
  [cookie de sesión seteada en la respuesta]
```

> **Tres piezas no obvias:**
> 1. El estado OAuth se guarda en Redis antes del redirect porque el callback llega en un request nuevo sin el body original.
> 2. El guard de `account.create.before` previene que un usuario que se registró con email+password pero no verificó pueda entrar via Google y bypassear la verificación.
> 3. El JWT se mintea directamente en `SocialCallbackHook @AfterHook` — el cliente no necesita llamar `/auth/token` para obtener el primer JWT.

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
- La denylist tiene costo real: un Redis lookup sincrónico en **cada** request Bearer

### Cuándo sí implementar la denylist

| Señal | Ejemplo |
|---|---|
| Sector regulado con requisito de revocación inmediata | Fintech, salud, gobierno |
| Tokens de larga duración (TTL > 15 min) | Si se sube el TTL por decisión de producto |
| Logout forzado por admin como control de seguridad crítico | Panel de seguridad con "revocar acceso ahora" |

### Implementación de la denylist (cuando se requiera)

```typescript
// 1. Incluir jti en el JWT al mintear (GetTokenUseCase)
const token = await this.jwtMintService.mint({ ..., jti: randomUUID() });

// 2. En SignOutHook @AfterHook, registrar el jti con TTL restante
const remainingTtl = Math.ceil((jwtExpiresAt.getTime() - Date.now()) / 1000);
if (remainingTtl > 0) {
  await redis.set(`jwt:revoked:${jti}`, '1', 'EX', remainingTtl);
}

// 3. En JwtAuthGuard, verificar la denylist para tokens Bearer
if (payload.jti) {
  const revoked = await redis.exists(`jwt:revoked:${payload.jti}`);
  if (revoked) throw new UnauthorizedException('TOKEN_REVOKED');
}
```

> **Costo:** un `redis.exists()` por cada request Bearer. En alta concurrencia, evaluar
> una caché LRU en memoria para amortiguar el hit a Redis.

---

## 14. Modelo de inactividad — qué cuenta como actividad y qué no

### Definición de "actividad"

El inactivity timer solo se renueva en **llamadas reales de API** que pasan por `SessionActivityMiddleware`.

```
Tipo de llamada                          ¿Renueva Redis TTL?
────────────────────────────────────────────────────────────
GET /api/reports                         ✅ siempre
POST /api/invoices                       ✅ siempre
authClient.getSession() [dentro 5 min]   ❌ cookie cache — no hay HTTP
authClient.getSession() [después 5 min]  ✅ hace HTTP → middleware corre
authClient.token()                       ✅ hace HTTP → GetTokenUseCase lo renueva
```

### Tolerancia conocida

```
inactivity timeout real = SESSION_INACTIVITY_TIMEOUT_SECONDS + cookieCache.maxAge
                        = 1800s + 300s = 35 min (máximo teórico)
```

### Cuándo cambiar `cookieCache.maxAge`

| Necesidad | Configuración |
|---|---|
| Comportamiento por defecto — tolerancia de 5 min aceptable | `maxAge: 60 * 5` |
| Compliance estricto — timeout exacto | `maxAge: 0` (o `enabled: false`) |
| Intermedio | `maxAge: 60` (1 min) |

> **Anti-patrón:** deshabilitar `cookieCache` sin entender la consecuencia. Si se deshabilita,
> los polls `getSession()` en background renovarían el timer, impidiendo desloguear usuarios idle.

### Qué NO renueva el timer (por diseño)

- Polls de `authClient.getSession()` dentro del `cookieCache.maxAge`
- Llamadas a `/api/v1/auth/*` (excluidas del middleware)
- Llamadas a rutas `@Public()`

---

## 15. Checklist de verificación pre-producción

### Seguridad base

- [ ] `BETTER_AUTH_SECRET` generado con `openssl rand -base64 32` (min 32 chars)
- [ ] `requireEmailVerification: true` en la config
- [ ] Argon2id con `memoryCost >= 65536`
- [ ] `PASSWORD_HISTORY_DEPTH >= 5`
- [ ] Brute force guard activo y testeado
- [ ] Rate limits activos en sign-up, sign-in y reset-password
- [ ] `useSecureCookies: env.NODE_ENV === 'production'` en `advanced`
- [ ] `sameSite` **no sobreescrito** — confiar en el default `lax` de Better-Auth

### Sesión

- [ ] Single-session activo (`session.create.before` borra sesiones previas del userId)
- [ ] `SessionActivityMiddleware` activo y excluye correctamente `/auth/*` y `/public/*`
- [ ] Redis disponible y conectado (rate limit + brute force + inactivity)
- [ ] `cookieCache.maxAge` y su tolerancia aceptada por el equipo de producto (ver §14)

### RBAC

- [ ] Migración `CREATE UNIQUE INDEX user_normalized_email_unique` aplicada (ver §3.3)
- [ ] Seed de roles `super_admin`, `admin`, `viewer` en migración inicial
- [ ] Seed de permisos `users:create/read/update/delete` en migración inicial
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
- [ ] Token TTL = 15 minutos (no aumentar sin justificación)
- [ ] `disableSettingJwtHeader: true` en config del plugin `jwt()`
- [ ] `GetTokenUseCase` verifica Redis inactivity key antes de mintear JWT
- [ ] `GetTokenUseCase` verifica `session.invalidBefore`
- [ ] Interceptor del cliente reintenta con JWT fresco en 401, luego hace logout en segundo 401
- [ ] Clientes mobile documentados para persistir `session.token` del sign-in
- [ ] Decisión sobre denylist JWT documentada (ver §13)

### 2FA

- [ ] `OTP_MAX_ATTEMPTS` configurado y el hook lo respeta
- [ ] Rate limit de envío de OTP activo
- [ ] Backup codes generados en enrollment de TOTP
