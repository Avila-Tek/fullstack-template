# SPEC: Migrate Hardcoded Error Messages to i18n

**Branch:** `feat/auth-integration-template`
**Scope:** `apps/api` — identity module only
**Status:** Draft — pending user confirmation

---

## 1. Objective

The API has a fully working i18n system for domain errors (`DomainExceptionFilter` + locale-aware message catalogs) and for Better Auth errors (`@better-auth/i18n` plugin with `esBetterAuthTranslations`). However, four places still throw plain `Error` with hardcoded English strings that bypass both systems:

- Two **domain value objects** throwing `new Error(...)` — should throw `DomainException` subclasses so the filter layer can translate them.
- Two **Better Auth hooks** throwing hardcoded English strings — should use i18n plugin keys so the plugin can translate them.

**Target users:** API consumers whose `Accept-Language` header is `es` and currently receive raw English error strings for the affected paths.

---

## 2. Errors in Scope

### Group A — Domain Value Objects → `DomainException`

These are errors we generate in domain code. They must become `DomainException` subclasses so the `DomainExceptionFilter` can translate them.

| File | Current throw | New behaviour |
|------|--------------|---------------|
| `modules/identity/domain/value-objects/user.value-object.ts:15` | `throw new Error('Invalid email address: "${raw}"')` | `throw new InvalidEmailException()` (new class, code `IDENTITY_INVALID_EMAIL`) |
| `modules/identity/domain/value-objects/password.value-object.ts:15` | `throw new Error(result.error.issues[0].message)` | `throw new InvalidPasswordException()` (reuse existing class, code `IDENTITY_INVALID_PASSWORD`) |

### Group B — Better Auth Hooks → i18n plugin keys

These errors are thrown inside Better Auth callbacks and flow through Better Auth's own pipeline (not through `DomainExceptionFilter`). They must use message strings that are keys in the `@better-auth/i18n` translations.

| File | Current message | New behaviour |
|------|----------------|---------------|
| `modules/identity/infrastructure/better-auth/auth.ts:142` (password hash hook) | `throw new Error(errors[0])` — raw Zod string | `throw new APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' })` — uses existing key in `esBetterAuthTranslations` |
| `modules/identity/infrastructure/better-auth/auth.ts:264` (account lockout hook) | `throw new APIError('TOO_MANY_REQUESTS', { message: 'Account temporarily locked.' })` | `message: 'ACCOUNT_TEMPORARILY_LOCKED'` — new key added to both `en` and `es` translations |

### Out of Scope

`env.ts:6`, `auth.ts:37`, `hmac-token.adapter.ts:16` — startup/config panics. They never reach a user and are intentionally English-only for ops visibility.

---

## 3. Deliverables

### 3.1 New exception class

**Create:** `apps/api/src/modules/identity/domain/exceptions/invalid-email.exception.ts`

```typescript
import { DomainException } from '@/shared/domain-utils';

export class InvalidEmailException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('IDENTITY_INVALID_EMAIL', meta);
  }
}
```

### 3.2 `user.value-object.ts` — throw domain exception

**Edit:** `apps/api/src/modules/identity/domain/value-objects/user.value-object.ts`

Replace:
```typescript
throw new Error(`Invalid email address: "${raw}"`);
```
With:
```typescript
throw new InvalidEmailException();
```

Import `InvalidEmailException` from `../exceptions/invalid-email.exception`.

> The VO must stay zero-framework. `InvalidEmailException` is a pure domain class — importing it stays within that constraint.

### 3.3 `password.value-object.ts` — throw domain exception

**Edit:** `apps/api/src/modules/identity/domain/value-objects/password.value-object.ts`

Replace:
```typescript
throw new Error(result.error.issues[0].message);
```
With:
```typescript
throw new InvalidPasswordException();
```

Import `InvalidPasswordException` from `../exceptions/invalid-password.exception`.

> `InvalidPasswordException` (`IDENTITY_INVALID_PASSWORD`) already exists and already has translations. No new class or catalog entry needed.

### 3.4 Add `IDENTITY_INVALID_EMAIL` to the identity i18n catalog

**Edit:** `apps/api/src/modules/identity/infrastructure/i18n/messages.ts`

1. Add `'IDENTITY_INVALID_EMAIL'` to the `IdentityErrorCode` union type.
2. Add entry to `identityDomainMessages`:
   ```typescript
   IDENTITY_INVALID_EMAIL: {
     en: 'Invalid email address.',
     es: 'Dirección de correo electrónico inválida.',
   },
   ```

### 3.5 Add HTTP status for `IDENTITY_INVALID_EMAIL`

**Edit:** `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`

Add to the `STATUS` map:
```typescript
IDENTITY_INVALID_EMAIL: 422,
```

### 3.6 Fix `password.hash` hook — `auth.ts:142`

**Edit:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

Replace:
```typescript
if (!valid) throw new Error(errors[0]);
```
With:
```typescript
if (!valid) throw new APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' });
```

`INVALID_PASSWORD` is already present in `esBetterAuthTranslations`. No translation changes needed.

### 3.7 Fix account-lockout hook — `auth.ts:264`

**Create:** `apps/api/src/modules/identity/infrastructure/better-auth/i18n/en-translations.ts`

```typescript
/**
 * English overrides and custom keys for better-auth error messages.
 *
 * Add entries here only for custom keys not covered by better-auth's built-in
 * English messages (which serve as the default for any untranslated key).
 */
export const enBetterAuthTranslations: Record<string, string> = {
  ACCOUNT_TEMPORARILY_LOCKED: 'Account temporarily locked.',
};
```

**Edit:** `apps/api/src/modules/identity/infrastructure/better-auth/i18n/translations.ts`

Add to `esBetterAuthTranslations`:
```typescript
ACCOUNT_TEMPORARILY_LOCKED: 'La cuenta está temporalmente bloqueada.',
```

**Edit:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

1. Import `enBetterAuthTranslations` from `./i18n/en-translations`.
2. Update the i18n plugin config:
   ```typescript
   i18n({
     defaultLocale: 'en',
     detection: ['header'],
     translations: {
       en: enBetterAuthTranslations,
       es: esBetterAuthTranslations,
     },
   }),
   ```
3. Change the message in the lockout hook:
   ```typescript
   // Before
   message: 'Account temporarily locked.'
   // After
   message: 'ACCOUNT_TEMPORARILY_LOCKED'
   ```

---

## 4. Code Style

Follows existing patterns:

- Exception classes: extend `DomainException`, single constructor, `super('<MODULE>_<CODE>')`.
- Error codes: `IDENTITY_<SCREAMING_SNAKE>` format.
- Translation catalogs: `Record<ErrorCode, Record<SupportedLocale, string>>` for domain; `Record<string, string>` for Better Auth.
- No `any`, no `console.log`, no mutation.

---

## 5. Testing Strategy

### Unit tests to write/update

| Test file | Assertions |
|-----------|-----------|
| `test/modules/identity/domain/value-objects/user.value-object.spec.ts` | `Email.create('')` and `Email.create('bad')` throw `InvalidEmailException`; `Email.create('a@b.com')` returns `Email` instance |
| `test/modules/identity/domain/value-objects/password.value-object.spec.ts` | `Password.create('weak')` throws `InvalidPasswordException`; `Password.create('StrongPass1!')` returns `Password` instance |

The Better Auth hook changes (3.6, 3.7) are tested via type-checking and manual verification — no unit test path exists for Better Auth's internal pipeline.

### Validation commands (run after all changes)

```bash
npx turbo typecheck --filter @repo/api   # missing translations are type errors
npx turbo lint --filter @repo/api
npm -C apps/api test
```

---

## 6. Boundaries

| Category | Rule |
|----------|------|
| **Always** | Throw `DomainException` subclass for any error generated in domain/application code |
| **Always** | Use i18n plugin message keys (all-caps snake) for errors thrown inside Better Auth callbacks |
| **Never** | Change startup config throws (`env.ts`, `hmac-token.adapter.ts`) — out of scope |
| **Never** | Put human-readable strings inside domain exceptions — error codes only |
| **Never** | Throw `DomainException` from inside a Better Auth callback (the `DomainExceptionFilter` does not intercept those) |
| **Ask first** | Changing any existing error code already referenced in client-side error handling |

---

## 7. Acceptance Criteria

- [ ] `Email.create('')` throws `InvalidEmailException`, not plain `Error`
- [ ] `Password.create('weak')` throws `InvalidPasswordException`, not plain `Error`
- [ ] A request with `Accept-Language: es` that triggers email validation failure receives `'Dirección de correo electrónico inválida.'` in the response
- [ ] A request with `Accept-Language: es` to sign-in on a locked account receives `'La cuenta está temporalmente bloqueada.'`
- [ ] `npx turbo typecheck --filter @repo/api` passes (type-safe catalog enforces no missing keys)
- [ ] `npx turbo lint --filter @repo/api` passes
- [ ] All existing identity module tests still pass
