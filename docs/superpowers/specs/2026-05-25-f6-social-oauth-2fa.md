# F6: Social OAuth + 2FA

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1, F2  
**Blocks:** —

---

## Objetivo

Autenticación federada y segundo factor de autenticación. Al terminar: login con Google operativo con todas las reglas de seguridad (captcha, estado Redis, guard de account linking); TOTP y OTP email funcionales con enrollment, activación/desactivación y backup codes.

---

## Fuera de scope

- Otros providers sociales (GitHub, Apple, etc.) — mismos patrones, fácil de agregar
- SMS OTP (requiere provider externo, fuera del template base)
- Device tracking (ver nota en `auth-standard.md` §2)

---

## Archivos a crear

```
apps/api/src/auth/
│
├── domain/
│   └── exceptions/
│       ├── two-factor-locked.exception.ts
│       ├── two-factor-otp-rate-limited.exception.ts
│       └── unverified-social-link-denied.exception.ts
│
├── application/
│   ├── events/auth.events.ts                    ← añadir: AuthTwoFactorEnabledEvent,
│   │                                               AuthTwoFactorDisabledEvent
│   ├── ports/
│   │   ├── in/
│   │   │   ├── activate-two-factor.port.ts
│   │   │   └── deactivate-two-factor.port.ts
│   │   └── out/
│   │       ├── two-factor-pending.port.ts       ← set(userId, method, ttl), get(userId), del(userId)
│   │       └── oauth-state.port.ts              ← set(correlationId, ctx, ttl), getAndDel(correlationId)
│   └── use-cases/
│       ├── activate-two-factor.use-case.ts      ← verifica TOTP antes de activar + genera backup codes
│       └── deactivate-two-factor.use-case.ts    ← requiere password o TOTP válido para desactivar
│
└── infrastructure/
    ├── hooks/
    │   ├── social-sign-in.hooks.ts              ← @BeforeHook /sign-in/social:
    │   │                                              CaptchaPort.verify()
    │   │                                              + generar correlationId
    │   │                                              + guardar Redis: oauth:ctx:{correlationId}
    │   │                                                TTL 10min
    │   ├── social-callback.hooks.ts             ← @BeforeHook /callback/:id: inyectar oauthCtxStore
    │   │                                           @AfterHook /callback/:id:
    │   │                                              consumir Redis oauth:ctx (fire-once, getdel)
    │   │                                              si no existe → AUTH_OAUTH_CONTEXT_LOST
    │   │                                              + mint JWT (misma lógica que GetTokenUseCase)
    │   │                                              + emit('auth.signed_in', { loginMethod: 'google' })
    │   ├── email-verification.hooks.ts          ← @AfterHook /verify-email:
    │   │                                              SecurityNotificationPort.sendNewLoginAlert
    │   ├── two-factor-enrollment.hooks.ts       ← @BeforeHook: rate limit intento enrollment
    │   ├── two-factor-send-otp.hooks.ts         ← @BeforeHook: BruteForcePort.increment(userId+':2fa')
    │   │                                              > OTP_MAX_ATTEMPTS → AUTH_2FA_OTP_RATE_LIMITED
    │   ├── two-factor-verify-otp.hooks.ts       ← @BeforeHook: BruteForcePort.increment
    │   │                                              > OTP_MAX_ATTEMPTS → AUTH_2FA_LOCKED
    │   │                                           @AfterHook: BruteForcePort.clear
    │   ├── two-factor-verify-totp.hooks.ts      ← @BeforeHook: mismo patrón que verify-otp
    │   │                                           TOTP replay check (ver nota)
    │   └── two-factor-disable.hooks.ts          ← @BeforeHook: verificar password o TOTP
    │                                               (delega a DeactivateTwoFactorPort)
    │
    ├── redis/
    │   ├── redis-oauth-state.adapter.ts         ← oauth:ctx:{correlationId}, getdel (fire-once)
    │   └── redis-two-factor-pending.adapter.ts  ← TTL = OTP_TTL_SECONDS, Zod validation on read
    │
    └── http/
        └── two-factor-status.controller.ts      ← @UseGuards(JwtAuthGuard)
                                                    GET /api/v1/auth/2fa/status
                                                    → { enabled: boolean, methods: string[] }
```

### Actualización en `better-auth.service.ts` (F6 amplía F2)

```typescript
// Añadir a better-auth config:

socialProviders: {
  ...(env.GOOGLE_ENABLED && {
    google: {
      clientId:     env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    },
  }),
},

plugins: [
  // jwt() añadido en F3
  // ...existing plugins...
  twoFactor({
    issuer: env.APP_NAME,
    otpOptions: {
      sendOTP: async ({ user, otp }) => emailService.send2faOtp(user.email, otp),
    },
  }),
  passkey(),
],

// Account linking guard (databaseHook account.create.before):
databaseHooks: {
  // ...existing hooks...
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google'],
    },
    create: {
      before: async (account) => {
        if (!account.userId) return;
        const [user] = await db.select({ emailVerified: userTable.emailVerified })
          .from(userTable).where(eq(userTable.id, account.userId));

        if (!user || user.emailVerified) return;

        const [credentialAccount] = await db.select({ id: accountTable.id })
          .from(accountTable)
          .where(and(
            eq(accountTable.userId, account.userId),
            eq(accountTable.providerId, 'credential'),
          ));

        if (credentialAccount) {
          throw new APIError(403, { error: 'AUTH_UNVERIFIED_SOCIAL_LINK_DENIED' });
        }
      },
    },
  },
},
```

---

## Detalles de implementación

### Flujo Social OAuth — dos fases

**Fase 1 — Iniciar OAuth:**
```
POST /api/v1/auth/sign-in/social  { provider: 'google', callbackURL, captchaToken }
  SocialSignInHook @BeforeHook:
    → CaptchaPort.verify(captchaToken)
    → correlationId = randomUUID()
    → Redis SET oauth:ctx:{correlationId} → { correlationId } TTL 600s
    → ctx.context.correlationId = correlationId
  BA → construye URL OAuth + PKCE state (incluye correlationId)
← 302 redirect → Google
```

**Fase 2 — Callback:**
```
GET /api/v1/auth/callback/google?code=...&state=...
  SocialCallbackHook @BeforeHook: inyectar oauthCtxStore en ctx
  BA → validar PKCE, intercambiar code, obtener perfil
  account.create.before databaseHook → guard de account linking
  session.create.before → single-session
  session.create.after  → seed Redis inactivity
  SocialCallbackHook @AfterHook:
    → getOAuthState() → extraer correlationId del PKCE state
    → Redis GETDEL oauth:ctx:{correlationId}
    → si null → throw AUTH_OAUTH_CONTEXT_LOST
    → mint JWT (roles via RbacFacadePort)
    → emit('auth.signed_in', { loginMethod: 'google' })
← 302 redirect → CLIENT_URL/auth/callback
```

**Por qué se minta el JWT directamente en el callback:** el cliente no puede llamar `/auth/token` inmediatamente porque el redirect es cross-origin. El JWT se inyecta en la query string del redirect para que el cliente SPA lo capture.

> **Nota de seguridad — JWT en query string:** pasar el JWT en la query string del redirect es un patrón estándar en OAuth (igual que Better-Auth y otros providers lo hacen). El cliente SPA **debe** extraer el JWT inmediatamente al montar la ruta `/auth/callback`, guardarlo en memoria (no `localStorage`) y limpiar la URL con `history.replaceState`. El JWT tiene TTL de 15 min; si es capturado en logs del servidor o referrer headers, el window de exposición es acotado.

### `ActivateTwoFactorUseCase`

```typescript
async execute(input: { userId: string; totpCode: string; backupCodes?: never }): Promise<{ backupCodes: string[] }> {
  // 1. Verificar código TOTP antes de activar (BA genera el secret)
  // 2. BA activa 2FA y genera backup codes hasheados
  // 3. emit('auth.2fa_enabled', { userId })
  // 4. Retornar backup codes en claro (solo esta vez)
}
```

### `DeactivateTwoFactorUseCase`

```typescript
async execute(input: { userId: string; password?: string; totpCode?: string }): Promise<void> {
  // Requiere uno de los dos: password correcto O código TOTP válido
  // Si ninguno → AUTH_INVALID_CREDENTIALS
  // BA desactiva 2FA
  // emit('auth.2fa_disabled', { userId })
}
```

### TOTP replay check

**Decisión:** confiar en el replay check interno de Better-Auth para el template base. BA no permite reusar el mismo código TOTP dentro de la misma ventana de tiempo (30s). No se implementa capa Redis adicional. Si un proyecto en particular requiere enforcement más estricto (ej: compliance), puede agregar `Redis SET totp:used:{userId}:{code} 1 EX 30` en el `@BeforeHook` de `verify-totp`.

### Flujo 2FA post sign-in

```
Sign-in exitoso con 2FA habilitado:
← 200 { twoFactorRedirect: true, twoFactorMethods: ['totp', 'email_otp'] }

POST /api/v1/auth/two-factor/send-otp    ← si elige email_otp
  TwoFactorSendOtpHook → rate limit por userId
  BA → enviar OTP por email (EmailPort.send2faOtp)

POST /api/v1/auth/two-factor/verify-otp | /verify-totp
  @BeforeHook → BruteForcePort.increment(userId+':2fa:otp')
               > OTP_MAX_ATTEMPTS → AUTH_2FA_LOCKED
  BA → validar código
  session.create hooks → single-session + Redis seed
  @AfterHook → BruteForcePort.clear(userId+':2fa:otp')
← 200 { user, session }
```

---

## Acceptance Criteria

### Social OAuth
- [ ] `POST /auth/sign-in/social` sin captcha válido → 400
- [ ] `POST /auth/sign-in/social` con captcha válido → 302 redirect a Google
- [ ] Callback OAuth sin Redis state (correlationId expirado o reusado) → 401 `AUTH_OAUTH_CONTEXT_LOST`
- [ ] Usuario sin verificar + cuenta credential intenta link social → 403 `AUTH_UNVERIFIED_SOCIAL_LINK_DENIED`
- [ ] OAuth flow completo → cookie de sesión seteada + JWT en redirect

### 2FA
- [ ] 5 intentos fallidos de OTP → 429 `AUTH_2FA_LOCKED`
- [ ] 5 intentos de envío de OTP → 429 `AUTH_2FA_OTP_RATE_LIMITED`
- [ ] Enrollment TOTP → retorna backup codes (solo una vez)
- [ ] Activar 2FA sin verificar código TOTP → BA retorna error apropiado
- [ ] `GET /api/v1/auth/2fa/status` autenticado → `{ enabled: true/false, methods: [...] }`
- [ ] Desactivar 2FA sin password ni TOTP → 401 `AUTH_INVALID_CREDENTIALS`
- [ ] Login con 2FA habilitado → 200 `{ twoFactorRedirect: true }`
- [ ] Verificar OTP correcto → sesión creada, cookie seteada

### General
- [ ] `GOOGLE_ENABLED=false` → rutas de social OAuth retornan 404 o no se registran
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan

---

## Notas de implementación

- `oauth:ctx:{correlationId}` usa `GETDEL` (fire-once): el estado se consume en el primer callback, ataques de replay del callback no funcionan.
- `CAPTCHA_ENABLED=false` en desarrollo: el adapter retorna `{ success: true }` sin llamar al proveedor.
- La rotación de backup codes se puede gatillar llamando a `activateTwoFactor` de nuevo — BA regenera los códigos.
- `passkey()` se incluye en los plugins de F6. Su flow (WebAuthn registration/authentication) es manejado completamente por BA; no requiere hooks custom para el template base.
