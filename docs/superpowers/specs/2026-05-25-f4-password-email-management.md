# F4: Password & Email Management

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1, F2, F3  
**Blocks:** —

---

## Objetivo

Ciclo de vida completo de credenciales. Change password (con validación de historial y política), reset password (flujo forget → reset), y change email con invalidación de sesiones via `sessionInvalidBefore`. Todos estos flujos setean `invalidBefore` en la sesión para forzar re-autenticación en el próximo `/auth/token`.

---

## Fuera de scope

- Social OAuth, 2FA (F6)
- Admin session management (F5)

---

## Archivos a crear

```
apps/api/src/auth/
│
├── domain/
│   └── exceptions/
│       └── no-password-account.exception.ts    ← usuario sin cuenta credential intenta cambiar password
│
├── application/
│   ├── events/auth.events.ts                   ← añadir: AuthPasswordResetEvent,
│   │                                              AuthPasswordChangedEvent, AuthEmailChangedEvent
│   ├── ports/
│   │   ├── in/
│   │   │   ├── request-password-reset.port.ts
│   │   │   └── get-change-email-pending.port.ts
│   │   └── out/
│   │       ├── password-reset-rate-limit.port.ts  ← checkAndIncrement(emailHash): Promise<boolean>
│   │       │                                         returns true si dentro del límite
│   │       └── change-email-pending.port.ts        ← set(userId, newEmail, ttl), get(userId),
│   │                                                  del(userId)
│   └── use-cases/
│       ├── request-password-reset.use-case.ts  ← rate limit check + enviar email reset
│       └── get-change-email-pending.use-case.ts ← lee Redis pendiente, retorna newEmail | null
│
└── infrastructure/
    ├── hooks/
    │   ├── forget-password.hooks.ts             ← @BeforeHook: rate limit por email hash
    │   │                                           @AfterHook: EmailPort.sendReset
    │   ├── reset-password.hooks.ts              ← @BeforeHook: PasswordPolicy.validate()
    │   │                                              + CheckPasswordHistoryPort.execute()
    │   │                                           @AfterHook: appendPasswordHistory
    │   │                                              + setSessionInvalidBefore(userId)
    │   │                                              + emit('auth.password_reset')
    │   ├── change-password.hooks.ts             ← @BeforeHook: verificar password actual
    │   │                                              + PasswordPolicy.validate()
    │   │                                              + CheckPasswordHistoryPort.execute()
    │   │                                           @AfterHook: appendPasswordHistory
    │   │                                              + setSessionInvalidBefore(userId)
    │   │                                              + SecurityNotificationPort.sendPasswordChangedAlert
    │   │                                              + emit('auth.password_changed')
    │   └── change-email.hooks.ts                ← @BeforeHook: guardar Redis pending (userId → newEmail, TTL 24h)
    │                                               @AfterHook: setSessionInvalidBefore(userId)
    │                                                  + SecurityNotificationPort.sendEmailChangedAlert
    │                                                  + emit('auth.email_changed')
    │
    ├── redis/
    │   ├── redis-password-reset-rate-limit.adapter.ts  ← sliding window por SHA256(email)
    │   │                                                  fail-open en caída de Redis
    │   └── redis-change-email-pending.adapter.ts       ← key: change_email:{userId}
    │                                                      TTL: 24h, Zod validation on read
    │
    └── http/
        └── change-email.controller.ts           ← @UseGuards(JwtAuthGuard)
                                                    GET /api/v1/auth/change-email/pending
                                                    → GetChangeEmailPendingPort.execute({ userId })
```

---

## Detalles de implementación

### `setSessionInvalidBefore` helper

Función interna (no un use-case) que actualiza `session.invalidBefore = new Date()` para todas las sesiones activas del `userId` en la tabla `session` de BA.

```typescript
// src/auth/infrastructure/better-auth/session-invalidation.helper.ts
export async function setSessionInvalidBefore(db: NodePgDatabase, userId: string): Promise<void> {
  const now = new Date();
  await db.update(sessionTable)
    .set({ invalidBefore: now })
    .where(eq(sessionTable.userId, userId));
}
```

> **Nota:** Better-Auth no expone `invalidBefore` de forma nativa. La solución **elegida** (no alternativa) es agregar la columna custom `invalid_before TIMESTAMPTZ` a la tabla `session` via `auth-schema-extensions.ts`. Esta columna se incluye en la migración Drizzle de F4. `GetTokenUseCase` (F3) ya verifica este campo comparando `session.invalidBefore` vs `session.createdAt`.

### Schema extension para `invalidBefore` (migración de F4)

```typescript
// auth/infrastructure/persistence/auth-schema-extensions.ts
import { pgTable, timestamp, text } from 'drizzle-orm/pg-core';

// Extiende la tabla 'session' de BA añadiendo la columna custom.
// Drizzle generará un ALTER TABLE en la migración.
export const sessionInvalidBeforeExtension = pgTable('session', {
  id:            text('id').primaryKey(),
  invalidBefore: timestamp('invalid_before', { withTimezone: true }),
});
```

### `ResetPasswordHook` — flujo completo

```
@BeforeHook /reset-password:
  1. PasswordPolicy.validate(newPassword) → AUTH_PASSWORD_POLICY_FAILED
  2. CheckPasswordHistoryPort.execute({ userId, plainPassword: newPassword })
     → AUTH_PASSWORD_REUSE si está en historial

BA:
  → Verifica token de reset (TTL del env.PASSWORD_RESET_TOKEN_TTL_SECONDS)
  → Actualiza hash de contraseña (Argon2id)

@AfterHook /reset-password:
  1. Append nueva entrada en password_history
  2. setSessionInvalidBefore(userId)
  3. emit('auth.password_reset', { userId, correlationId })
```

### `ChangePasswordHook` — flujo completo

```
@BeforeHook /change-password:
  1. Verificar que usuario tenga cuenta credential → AUTH_NO_PASSWORD_ACCOUNT si no
  2. Verificar password actual con argon2.verify → AUTH_INVALID_CREDENTIALS si incorrecto
  3. PasswordPolicy.validate(newPassword)
  4. CheckPasswordHistoryPort.execute({ userId, plainPassword: newPassword })

BA:
  → Actualiza hash de contraseña

@AfterHook /change-password:
  1. Append en password_history
  2. setSessionInvalidBefore(userId)
  3. SecurityNotificationPort.sendPasswordChangedAlert(email)
  4. emit('auth.password_changed', { userId })
```

### `ChangeEmailHook` — flujo completo

```
@BeforeHook /change-email:
  1. Guardar en Redis: change_email:{userId} → { newEmail, requestedAt } TTL 24h

BA:
  → Envía email de verificación al nuevo email
  → Cuando usuario verifica → actualiza email en tabla user

@AfterHook /callback/change-email (verificación completada):
  1. setSessionInvalidBefore(userId)
  2. Del change_email:{userId} de Redis
  3. SecurityNotificationPort.sendEmailChangedAlert(oldEmail, newEmail)
  4. emit('auth.email_changed', { userId })
```

### `PasswordResetRateLimitAdapter`

```typescript
// Sliding window: RESET_RATE_LIMIT_MAX intentos por hora por SHA256(email)
// Fail-open: si Redis no responde → retorna true (permite el intento)
// Key: password_reset_rl:{sha256(email)}
async checkAndIncrement(emailHash: string): Promise<boolean> {
  try {
    const key = `password_reset_rl:${emailHash}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 3600);
    return count <= env.RESET_RATE_LIMIT_MAX;
  } catch {
    return true; // fail-open
  }
}
```

---

## Acceptance Criteria

- [ ] `POST /api/v1/auth/forget-password` > `RESET_RATE_LIMIT_MAX` veces/hora por email → 429
- [ ] Reset con token inválido → BA retorna error apropiado
- [ ] Reset con contraseña que viola política → 400 `AUTH_PASSWORD_POLICY_FAILED`
- [ ] Reset con contraseña en historial → 422 `AUTH_PASSWORD_REUSE`
- [ ] Reset exitoso → `session.invalidBefore` seteado para todas las sesiones del usuario en DB
- [ ] Reset exitoso → segunda llamada a `POST /api/v1/auth/token` con sesión anterior → 401 `AUTH_SESSION_INVALIDATED`
- [ ] Change password exitoso → sesiones anteriores marcadas con `invalidBefore` → próximo `/auth/token` → 401 `AUTH_SESSION_INVALIDATED`
- [ ] Change password sin cuenta credential → 400 `AUTH_NO_PASSWORD_ACCOUNT`
- [ ] Change email iniciado → Redis key `change_email:{userId}` existe con TTL ≤ 86400s
- [ ] `GET /api/v1/auth/change-email/pending` sin pendiente → `{ pending: false, newEmail: null }`
- [ ] `GET /api/v1/auth/change-email/pending` con pendiente → `{ pending: true, newEmail: 'new@email.com' }`
- [ ] Verificación de nuevo email completa → `change_email:{userId}` eliminado de Redis + sesiones invalidadas
- [ ] SecurityNotification enviada en change password y change email exitosos
- [ ] Migración Drizzle de F4 incluye columna `invalid_before` en tabla `session`
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan

---

## Notas de implementación

- La migración `invalid_before` es un `ALTER TABLE session ADD COLUMN invalid_before TIMESTAMPTZ` — no rompe sesiones existentes (null = sin restricción).
- `ForgetPasswordHook` usa `SHA256(email)` para el rate limit key, nunca el email en texto plano.
- El fail-open en el rate limit de reset es intencional: es preferible enviar un email extra que bloquear el reset de password cuando Redis está caído.
- `GetChangeEmailPendingUseCase` retorna `null` como `newEmail` (no lanza error) si no hay cambio pendiente o si el TTL expiró. El cliente trata `pending: false` y `pending: false con TTL expirado` de forma idéntica.
