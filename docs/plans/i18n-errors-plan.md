# Plan: Migrate Hardcoded Error Messages to i18n

**Spec:** `docs/specs/SPEC-i18n-errors.md`
**Branch:** `feat/auth-integration-template`
**Scope:** `apps/api` — identity module only

---

## Problem Statement

Four locations in the identity module throw plain `Error` or hardcoded English strings that bypass the existing i18n pipeline:

- `user.value-object.ts:15` — `throw new Error('Invalid email address: ...')` bypasses `DomainExceptionFilter`
- `password.value-object.ts:15` — `throw new Error(result.error.issues[0].message)` bypasses `DomainExceptionFilter`
- `auth.ts:142` — `throw new Error(errors[0])` inside a Better Auth hook
- `auth.ts:264` — `throw new APIError('TOO_MANY_REQUESTS', { message: 'Account temporarily locked.' })` hardcoded English

---

## Dependency Graph

```
Phase 1 — Email VO full i18n path
  A1 [CREATE] invalid-email.exception.ts
    └→ A2 [EDIT]   messages.ts           — add IDENTITY_INVALID_EMAIL code + translations
         └→ A3 [EDIT]   domain-to-http.mapper.ts — map → 422
              └→ A4 [EDIT]   user.value-object.ts      — throw InvalidEmailException
                   └→ A5 [EDIT]   user.value-object.spec.ts — assert new exception type

  ══ CHECKPOINT A ══ typecheck + lint + value-object tests

Phase 2 — Password VO fix (class already exists)
  B1 [EDIT] password.value-object.ts     — throw InvalidPasswordException
    └→ B2 [EDIT] password.value-object.spec.ts — assert InvalidPasswordException

  ══ CHECKPOINT B ══ typecheck + lint + value-object tests

Phase 3 — Better Auth hook fixes (separate pipeline; no domain filter)
  C1 [EDIT] auth.ts:142 — throw APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' })

  C2a [CREATE] better-auth/i18n/en-translations.ts — ACCOUNT_TEMPORARILY_LOCKED en key
    └→ C2b [EDIT] better-auth/i18n/translations.ts  — add ACCOUNT_TEMPORARILY_LOCKED es key
         └→ C2c [EDIT] auth.ts                      — import en translations,
                                                       add en to i18n plugin,
                                                       change lockout message → key

  ══ CHECKPOINT C ══ typecheck + lint (no unit test path for Better Auth internals)

Phase 4 — Final validation
  V1: npx turbo typecheck --filter @repo/api
  V2: npx turbo lint --filter @repo/api
  V3: npm -C apps/api test
```

---

## Phase 1 — Email VO i18n Path

### A1 — Create `InvalidEmailException`

**File to create:** `apps/api/src/modules/identity/domain/exceptions/invalid-email.exception.ts`

Mirrors the existing `invalid-password.exception.ts` exactly:

```typescript
import { DomainException } from '@/shared/domain-utils';

export class InvalidEmailException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('IDENTITY_INVALID_EMAIL', meta);
  }
}
```

**Acceptance criteria:**
- File exists and exports `InvalidEmailException`
- Extends `DomainException` from `@/shared/domain-utils`
- Constructor calls `super('IDENTITY_INVALID_EMAIL', meta)`
- No human-readable string in the class body

---

### A2 — Add `IDENTITY_INVALID_EMAIL` to the identity i18n catalog

**File to edit:** `apps/api/src/modules/identity/infrastructure/i18n/messages.ts`

Current `IdentityErrorCode` union:
```typescript
type IdentityErrorCode =
  | 'IDENTITY_INVALID_CREDENTIALS'
  | 'IDENTITY_INVALID_PASSWORD'
  | 'IDENTITY_NO_PASSWORD_ACCOUNT'
  | 'IDENTITY_PASSWORD_REUSE'
  | 'IDENTITY_SESSION_NOT_FRESH';
```

Changes:
1. Extend the union with `| 'IDENTITY_INVALID_EMAIL'`
2. Add entry to `identityDomainMessages`:
   ```typescript
   IDENTITY_INVALID_EMAIL: {
     en: 'Invalid email address.',
     es: 'Dirección de correo electrónico inválida.',
   },
   ```

**Acceptance criteria:**
- `IdentityErrorCode` includes `'IDENTITY_INVALID_EMAIL'`
- `identityDomainMessages` has a matching entry with both `en` and `es` strings
- `npx turbo typecheck --filter @repo/api` would fail here if either is missing (type-safe catalog)

---

### A3 — Map `IDENTITY_INVALID_EMAIL` to HTTP 422

**File to edit:** `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`

Current `STATUS` map includes:
```typescript
IDENTITY_INVALID_PASSWORD: 422,
```

Add:
```typescript
IDENTITY_INVALID_EMAIL: 422,
```

**Acceptance criteria:**
- `IDENTITY_INVALID_EMAIL` maps to `422`
- No other existing mappings changed

---

### A4 — Update `user.value-object.ts` to throw `InvalidEmailException`

**File to edit:** `apps/api/src/modules/identity/domain/value-objects/user.value-object.ts`

Current (line 15):
```typescript
throw new Error(`Invalid email address: "${raw}"`);
```

Replace with:
```typescript
throw new InvalidEmailException();
```

Add import at the top (after the comment, before class — VO is currently import-free):
```typescript
import { InvalidEmailException } from '../exceptions/invalid-email.exception';
```

**Constraints:**
- The VO must stay zero-framework. `InvalidEmailException` is a pure domain class — this import stays within that constraint.
- Do not import anything from NestJS, Express, or `@repo/services`.

**Acceptance criteria:**
- `throw new Error(...)` is gone
- `InvalidEmailException` is imported and thrown
- No framework imports added

---

### A5 — Update `user.value-object.spec.ts`

**File to edit:** `apps/api/test/modules/identity/domain/value-objects/user.value-object.spec.ts`

Tests currently assert that invalid email throws (likely with `.toThrow()`). Update to assert on the specific exception type:

```typescript
import { InvalidEmailException } from '@/modules/identity/domain/exceptions/invalid-email.exception';

// ...

it('throws InvalidEmailException for empty input', () => {
  expect(() => Email.create('')).toThrow(InvalidEmailException);
});

it('throws InvalidEmailException for malformed email', () => {
  expect(() => Email.create('not-an-email')).toThrow(InvalidEmailException);
});
```

**Acceptance criteria:**
- Tests assert `InvalidEmailException` (not generic `Error`)
- `Email.create('a@b.com')` test still asserts it returns an `Email` instance
- All tests pass

---

## Phase 2 — Password VO Fix

### B1 — Update `password.value-object.ts` to throw `InvalidPasswordException`

**File to edit:** `apps/api/src/modules/identity/domain/value-objects/password.value-object.ts`

Current (line 15):
```typescript
throw new Error(result.error.issues[0].message);
```

Replace with:
```typescript
throw new InvalidPasswordException();
```

Add import at top:
```typescript
import { InvalidPasswordException } from '../exceptions/invalid-password.exception';
```

**Note:** `InvalidPasswordException` already exists and `IDENTITY_INVALID_PASSWORD` is already in the catalog and mapper. No catalog or mapper changes needed.

**Acceptance criteria:**
- `throw new Error(...)` is gone
- `InvalidPasswordException` is imported and thrown
- No new files needed

---

### B2 — Update `password.value-object.spec.ts`

**File to edit:** `apps/api/test/modules/identity/domain/value-objects/password.value-object.spec.ts`

Update assertions to use the specific exception class:

```typescript
import { InvalidPasswordException } from '@/modules/identity/domain/exceptions/invalid-password.exception';

// ...

it('throws InvalidPasswordException for weak password', () => {
  expect(() => Password.create('weak')).toThrow(InvalidPasswordException);
});
```

**Acceptance criteria:**
- Tests assert `InvalidPasswordException` (not generic `Error`)
- `Password.create('StrongPass1!')` test still asserts a `Password` instance
- All tests pass

---

## Phase 3 — Better Auth Hook Fixes

> **Important architectural note:** Errors thrown inside Better Auth hooks flow through Better Auth's own response pipeline, **not** through `DomainExceptionFilter`. Do NOT throw `DomainException` here — use `APIError` with an i18n key as the message.

### C1 — Fix `password.hash` hook (auth.ts:142)

**File to edit:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

Current (line 142):
```typescript
if (!valid) throw new Error(errors[0]);
```

Replace with:
```typescript
if (!valid) throw new APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' });
```

**Note:** `INVALID_PASSWORD` is already present in `esBetterAuthTranslations`. No translation files change.

**Acceptance criteria:**
- `throw new Error(errors[0])` is gone
- `APIError` is already imported in `auth.ts` (used on line 264) — no new import needed
- `'INVALID_PASSWORD'` is an all-caps snake key matching the i18n catalog pattern

---

### C2a — Create English Better Auth translations file

**File to create:** `apps/api/src/modules/identity/infrastructure/better-auth/i18n/en-translations.ts`

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

**Acceptance criteria:**
- File exists and exports `enBetterAuthTranslations`
- `ACCOUNT_TEMPORARILY_LOCKED` key has the English string
- JSDoc comment explains the intent (only custom keys that aren't built-in)

---

### C2b — Add `ACCOUNT_TEMPORARILY_LOCKED` to Spanish translations

**File to edit:** `apps/api/src/modules/identity/infrastructure/better-auth/i18n/translations.ts`

Add to `esBetterAuthTranslations`:
```typescript
ACCOUNT_TEMPORARILY_LOCKED: 'La cuenta está temporalmente bloqueada.',
```

**Acceptance criteria:**
- `ACCOUNT_TEMPORARILY_LOCKED` is in `esBetterAuthTranslations`
- Spanish string is correct
- No other existing keys changed

---

### C2c — Wire `en` translations into the i18n plugin + fix lockout hook

**File to edit:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

**Change 1** — Add import (near top of file, with existing Better Auth i18n import):
```typescript
import { enBetterAuthTranslations } from './i18n/en-translations';
```

**Change 2** — Update i18n plugin (currently lines 219–225):
```typescript
// Before:
i18n({
  defaultLocale: 'en',
  detection: ['header'],
  translations: {
    es: esBetterAuthTranslations,
  },
}),

// After:
i18n({
  defaultLocale: 'en',
  detection: ['header'],
  translations: {
    en: enBetterAuthTranslations,
    es: esBetterAuthTranslations,
  },
}),
```

**Change 3** — Fix lockout hook message (currently line 264–266):
```typescript
// Before:
throw new APIError('TOO_MANY_REQUESTS', {
  message: 'Account temporarily locked.',
});

// After:
throw new APIError('TOO_MANY_REQUESTS', {
  message: 'ACCOUNT_TEMPORARILY_LOCKED',
});
```

**Acceptance criteria:**
- `enBetterAuthTranslations` is imported and passed to `translations.en`
- Lockout message is the key `'ACCOUNT_TEMPORARILY_LOCKED'`, not the English string
- No other hook logic changed

---

## Phase 4 — Final Validation

Run in order:

```bash
npx turbo typecheck --filter @repo/api
# Missing translations are type errors — this catches A2 regressions

npx turbo lint --filter @repo/api
# Fix with: npx turbo lint:fix --filter @repo/api

npm -C apps/api test
# Must show all identity module tests passing
```

---

## Acceptance Criteria (from spec §7)

- [ ] `Email.create('')` throws `InvalidEmailException`, not plain `Error`
- [ ] `Password.create('weak')` throws `InvalidPasswordException`, not plain `Error`
- [ ] A request with `Accept-Language: es` that triggers email validation failure receives `'Dirección de correo electrónico inválida.'`
- [ ] A request with `Accept-Language: es` to sign-in on a locked account receives `'La cuenta está temporalmente bloqueada.'`
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] `npx turbo lint --filter @repo/api` passes
- [ ] All existing identity module tests still pass

---

## Out of Scope (do not touch)

- `env.ts:6`, `auth.ts:37`, `hmac-token.adapter.ts:16` — startup panics, intentionally English-only
- Any existing error codes already referenced in client-side error handling
- Any module outside `apps/api/src/modules/identity/`
