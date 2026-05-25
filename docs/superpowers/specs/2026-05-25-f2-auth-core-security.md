# F2: Auth Core + Security

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1  
**Blocks:** F3, F4, F5, F6

---

## Objetivo

Auth funcional con todos los mecanismos de seguridad base. Al terminar: signup, signin y signout operativos con Argon2id, single-session, brute force, captcha, historial de contraseñas, política de contraseñas, session activity middleware y audit log desacoplado via EventEmitter2.

---

## Fuera de scope

- JWT, token refresh y RBAC (F3)
- Change password, reset password, change email (F4)
- Social OAuth, 2FA (F6)

---

## Archivos a crear

```
apps/api/src/
│
├── auth/
│   ├── module.ts
│   │
│   ├── domain/
│   │   ├── exceptions/
│   │   │   ├── account-locked.exception.ts
│   │   │   ├── email-delivery-failed.exception.ts
│   │   │   ├── password-policy-failed.exception.ts
│   │   │   └── password-reuse.exception.ts
│   │   └── policies/
│   │       └── password.policy.ts              ← validación complejidad (pure TS, zero deps)
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   └── out/
│   │   │       ├── brute-force.port.ts         ← increment(email), clear(email), getCount(email)
│   │   │       ├── captcha.port.ts             ← verify(token, ip?): Promise<{success: boolean}>
│   │   │       ├── email.port.ts               ← sendVerification, sendReset, send2faOtp,
│   │   │       │                                  sendLoginAlert, sendFailedLoginAlert, sendSessionRevoked
│   │   │       ├── security-notification.port.ts ← sendNewLoginAlert, sendPasswordChangedAlert,
│   │   │       │                                    sendEmailChangedAlert
│   │   │       ├── password-history.repository.port.ts
│   │   │       └── session.repository.port.ts
│   │   ├── events/
│   │   │   └── auth.events.ts                  ← AuthSignedUpEvent, AuthSignedInEvent,
│   │   │                                          AuthSignedOutEvent (más eventos en F3/F4/F6)
│   │   └── use-cases/
│   │       └── check-password-history.use-case.ts  ← verifica que nuevo hash no coincida con historial
│   │
│   └── infrastructure/
│       ├── better-auth/
│       │   ├── better-auth.service.ts          ← @Injectable(); crea y exporta instancia BA
│       │   │                                      recibe EmailPort, Argon2HashAdapter, RedisClient
│       │   └── argon2.config.ts                ← ARGON2_OPTIONS de env.ts
│       │
│       ├── hooks/
│       │   ├── sign-up.hooks.ts                ← @BeforeHook: CaptchaPort.verify()
│       │   │                                      @AfterHook: emit('auth.signed_up')
│       │   ├── sign-in.hooks.ts                ← @BeforeHook: BruteForcePort.increment(); >MAX → throw
│       │   │                                      @AfterHook: BruteForcePort.clear() + emit('auth.signed_in')
│       │   └── sign-out.hooks.ts               ← @AfterHook: Redis inactivity key del + emit('auth.signed_out')
│       │
│       ├── persistence/
│       │   ├── auth.schema.ts                  ← tablas BA (user, session, account, verification,
│       │   │                                      twoFactor, jwks, rateLimit, passkey)
│       │   ├── auth-schema-extensions.ts       ← uniqueIndex('user_normalized_email_unique')
│       │   ├── password-history.schema.ts
│       │   ├── audit-log.schema.ts             ← auth_audit_log (email_hash, ip_hash — NO texto plano)
│       │   ├── password-history.repository-adapter.ts
│       │   └── session.repository-adapter.ts
│       │
│       ├── adapters/
│       │   ├── argon2-hash.adapter.ts          ← hash/verify con ARGON2_OPTIONS
│       │   ├── brute-force.adapter.ts          ← Redis INCR/EXPIRE por email normalizado
│       │   ├── email.adapter.ts                ← SMTP via nodemailer o Resend
│       │   ├── security-notification.adapter.ts ← implementa SecurityNotificationPort
│       │   └── captcha/
│       │       ├── cloudflare-captcha.adapter.ts  ← Turnstile siteverify
│       │       └── google-captcha.adapter.ts      ← reCAPTCHA v2/v3 con score threshold
│       │
│       ├── middleware/
│       │   └── session-activity.middleware.ts  ← verifica Redis TTL; si ausente → 401 SESSION_EXPIRED
│       │                                          Si presente → renovar TTL en cada request
│       │
│       └── listeners/
│           └── audit-log.listener.ts           ← @OnEvent('auth.*')
│                                                  → INSERT auth_audit_log con SHA256(email), SHA256(ip)
│                                                  NUNCA lanza excepciones
│
└── infrastructure/
    └── health/
        ├── redis.health-indicator.ts           ← PING
        └── auth.health-indicator.ts            ← SELECT 1 FROM session LIMIT 1
```

---

## Better-Auth — configuración base (F2)

```typescript
export const auth = betterAuth({
  baseURL: env.API_BASE_URL,
  basePath: '/api/v1/auth',
  database: drizzleAdapter(db, { provider: 'pg' }),
  secret: env.BETTER_AUTH_SECRET,

  session: {
    expiresIn:   60 * 60 * 24 * 7,   // 7 días
    updateAge:   60 * 60 * 24,        // refresh si >1 día
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,   // NO negociable
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash:   (plain) => argon2.hash(plain, ARGON2_OPTIONS),
      verify: ({ hash, plain }) => argon2.verify(hash, plain),
    },
    sendResetPassword: async ({ user, url }) => emailService.sendPasswordReset(user.email, url),
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => emailService.sendVerification(user.email, url),
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  // JWT plugin añadido en F3
  // twoFactor plugin añadido en F6
  // passkey plugin añadido en F6
  // socialProviders añadidos en F6
  plugins: [],

  rateLimit: {
    storage: 'secondary-storage',   // Redis
    customRules: {
      '/sign-up/email':           { window: 3600, max: env.SIGNUP_RATE_LIMIT_MAX },
      '/sign-in/email':           { window: 900,  max: env.SIGNIN_RATE_LIMIT_MAX },
      '/forget-password':         { window: 3600, max: env.RESET_RATE_LIMIT_MAX },
      '/send-verification-email': { window: 3600, max: 3 },
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Single-session: elimina sesión previa del mismo userId
        before: async (session) => {
          await db.delete(sessionTable).where(
            and(eq(sessionTable.userId, session.userId), ne(sessionTable.id, session.id)),
          );
          return { data: session };
        },
        // Seed de inactivity key en Redis
        after: async (session) => {
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
          data: { ...user, normalizedEmail: user.email.toLowerCase().trim() },
        }),
      },
    },
  },

  trustedOrigins: [env.CLIENT_URL],

  advanced: {
    cookiePrefix: env.COOKIE_PREFIX,
    useSecureCookies: env.NODE_ENV === 'production',
    // sameSite: NO sobreescribir; lax es el default correcto de BA.
    // 'strict' rompe OAuth callbacks y links de email.
  },
});
```

---

## Detalles de implementación

### `PasswordPolicy` (domain, pure TS)

Valida:
- Longitud mínima (8) y máxima (128)
- Al menos 1 mayúscula, 1 minúscula, 1 dígito, 1 carácter especial
- Sin espacios al inicio/fin

Lanza `PasswordPolicyFailedException` con campo `violations: string[]`.

### `CheckPasswordHistoryUseCase`

Input port:
```typescript
export abstract class CheckPasswordHistoryPort {
  abstract execute(input: { userId: string; plainPassword: string }): Promise<void>;
  // lanza PasswordReuseException si coincide con historial
}
```

Carga las últimas `PASSWORD_HISTORY_DEPTH` entradas del usuario. Verifica cada hash con `argon2.verify`. Si coincide → `throw new PasswordReuseException()`.

### `SessionActivityMiddleware`

```typescript
// Extrae sessionId de la cookie (nombre: `${COOKIE_PREFIX}.session_token`)
// Si no hay sessionId → next() (ruta pública o sin sesión)
// Lee Redis: session:{id}:activity
// Si no existe → clearCookie + 401 AUTH_SESSION_EXPIRED
// Si existe → renovar TTL + next()
```

**Excluir de:** `/api/v1/auth/*`, `/api/v1/public/*`, `/health`

### `AuditLogListener`

```typescript
@OnEvent('auth.*', { async: true })
async handle(event: AuditLogEvent): Promise<void> {
  try {
    await this.db.insert(authAuditLogTable).values({
      event:         event.type,
      userId:        event.userId,
      emailHash:     event.email ? sha256(event.email.toLowerCase().trim()) : null,
      ipHash:        event.ip    ? sha256(event.ip) : null,
      sessionId:     event.sessionId,
      correlationId: event.correlationId,
      metadata:      event.metadata ?? {},
    });
  } catch (err) {
    this.logger.error({ err, event: event.type }, 'audit log insert failed');
    // NO re-throw — el audit log no debe bloquear el flujo
  }
}
```

### Módulo wiring

```typescript
@Module({
  imports: [EventEmitterModule.forFeature()],  // o heredado del root
  providers: [
    BetterAuthService,
    // Output ports → adapters
    { provide: BruteForcePort,             useClass: RedisBruteForceAdapter },
    { provide: CaptchaPort,                useClass: CloudflareCaptchaAdapter },
    { provide: EmailPort,                  useClass: SmtpEmailAdapter },
    { provide: SecurityNotificationPort,   useClass: SecurityNotificationAdapter },
    { provide: PasswordHistoryRepositoryPort, useClass: DrizzlePasswordHistoryAdapter },
    { provide: SessionRepositoryPort,      useClass: DrizzleSessionRepositoryAdapter },
    // Use-cases / in-ports
    { provide: CheckPasswordHistoryPort,   useClass: CheckPasswordHistoryUseCase },
    // Listeners
    AuditLogListener,
  ],
})
export class AuthModule {}
```

---

## Acceptance Criteria

- [ ] `POST /api/v1/auth/sign-up/email` → 201, usuario creado, email de verificación enviado
- [ ] Sign-up con email ya registrado → 422 (BA maneja)
- [ ] `POST /api/v1/auth/sign-in/email` sin verificar email → 403 (BA maneja)
- [ ] Sign-in correcto → 200, cookie `app.session_token` seteada, single-session activo
- [ ] Sign-in con credenciales incorrectas 6 veces (BRUTE_FORCE_MAX_ATTEMPTS=5) → 429 `AUTH_ACCOUNT_LOCKED`
- [ ] Sign-in exitoso tras lockout → contador reseteado
- [ ] Password en historial (en signup de una nueva contraseña) → 422 `AUTH_PASSWORD_REUSE`
- [ ] Password que no cumple política → 400 `AUTH_PASSWORD_POLICY_FAILED`
- [ ] Request a ruta protegida con sesión idle >30min → 401 `AUTH_SESSION_EXPIRED`
- [ ] Login desde nuevo cliente → sesión anterior revocada (single-session)
- [ ] `GET /health/ready` → incluye Redis y auth DB health
- [ ] `auth_audit_log` tiene registros de sign_up y sign_in con email_hash e ip_hash (no texto plano)
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan

---

## Notas de implementación

- `CAPTCHA_ENABLED=false` en desarrollo — el adapter retorna `{ success: true }` directamente sin llamar al proveedor.
- El adapter de captcha se selecciona con `CAPTCHA_PROVIDER=cloudflare|google` (env var; default `cloudflare`). Agregar `CAPTCHA_PROVIDER: z.enum(['cloudflare', 'google']).default('cloudflare')` al schema de `env.ts` en F1. El módulo usa `{ provide: CaptchaPort, useClass: env.CAPTCHA_PROVIDER === 'google' ? GoogleCaptchaAdapter : CloudflareCaptchaAdapter }` en la selección dinámica dentro de `AuthModule`.
- `normalizedEmail` se computa en `databaseHook user.create.before`, no en el hook de signup. El unique index se crea en la migración post-setup (ver overview §4).
- La instancia `auth` de Better-Auth se crea en `BetterAuthService.onModuleInit()` para garantizar que las dependencias (Redis, DB) estén disponibles.
