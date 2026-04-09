# TODO: Migrate Hardcoded Error Messages to i18n

**Plan:** `docs/plans/i18n-errors-plan.md`
**Spec:** `docs/specs/SPEC-i18n-errors.md`

---

## Phase 1 — Email VO i18n Path

- [ ] **A1** — CREATE `apps/api/src/modules/identity/domain/exceptions/invalid-email.exception.ts`
      Extend `DomainException`, `super('IDENTITY_INVALID_EMAIL', meta)`

- [ ] **A2** — EDIT `apps/api/src/modules/identity/infrastructure/i18n/messages.ts`
      Add `'IDENTITY_INVALID_EMAIL'` to `IdentityErrorCode` union + add en/es translations

- [ ] **A3** — EDIT `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`
      Add `IDENTITY_INVALID_EMAIL: 422` to the `STATUS` map

- [ ] **A4** — EDIT `apps/api/src/modules/identity/domain/value-objects/user.value-object.ts`
      Replace `throw new Error(...)` with `throw new InvalidEmailException()`; add import

- [ ] **A5** — EDIT `apps/api/test/modules/identity/domain/value-objects/user.value-object.spec.ts`
      Assert `InvalidEmailException` (not generic `Error`) for empty and malformed inputs

### CHECKPOINT A
- [ ] `npx turbo typecheck --filter @repo/api` — passes
- [ ] `npx turbo lint --filter @repo/api` — passes
- [ ] `npm -C apps/api test` — value-object tests pass

---

## Phase 2 — Password VO Fix

- [ ] **B1** — EDIT `apps/api/src/modules/identity/domain/value-objects/password.value-object.ts`
      Replace `throw new Error(result.error.issues[0].message)` with `throw new InvalidPasswordException()`; add import

- [ ] **B2** — EDIT `apps/api/test/modules/identity/domain/value-objects/password.value-object.spec.ts`
      Assert `InvalidPasswordException` (not generic `Error`) for weak password inputs

### CHECKPOINT B
- [ ] `npx turbo typecheck --filter @repo/api` — passes
- [ ] `npx turbo lint --filter @repo/api` — passes
- [ ] `npm -C apps/api test` — value-object tests pass

---

## Phase 3 — Better Auth Hook Fixes

- [ ] **C1** — EDIT `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` (line 142)
      Replace `throw new Error(errors[0])` with `throw new APIError('BAD_REQUEST', { message: 'INVALID_PASSWORD' })`

- [ ] **C2a** — CREATE `apps/api/src/modules/identity/infrastructure/better-auth/i18n/en-translations.ts`
      Export `enBetterAuthTranslations` with `ACCOUNT_TEMPORARILY_LOCKED: 'Account temporarily locked.'`

- [ ] **C2b** — EDIT `apps/api/src/modules/identity/infrastructure/better-auth/i18n/translations.ts`
      Add `ACCOUNT_TEMPORARILY_LOCKED: 'La cuenta está temporalmente bloqueada.'` to `esBetterAuthTranslations`

- [ ] **C2c** — EDIT `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`
      1. Import `enBetterAuthTranslations` from `./i18n/en-translations`
      2. Add `en: enBetterAuthTranslations` to the i18n plugin `translations` config
      3. Change lockout hook message from `'Account temporarily locked.'` to `'ACCOUNT_TEMPORARILY_LOCKED'`

### CHECKPOINT C
- [ ] `npx turbo typecheck --filter @repo/api` — passes
- [ ] `npx turbo lint --filter @repo/api` — passes

---

## Phase 4 — Final Validation

- [ ] **V1** `npx turbo typecheck --filter @repo/api`
- [ ] **V2** `npx turbo lint --filter @repo/api`
- [ ] **V3** `npm -C apps/api test`

---

## Final Acceptance Checklist

- [ ] `Email.create('')` throws `InvalidEmailException`, not plain `Error`
- [ ] `Password.create('weak')` throws `InvalidPasswordException`, not plain `Error`
- [ ] Spanish locale receives `'Dirección de correo electrónico inválida.'` for email errors
- [ ] Spanish locale receives `'La cuenta está temporalmente bloqueada.'` for lockout
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] `npx turbo lint --filter @repo/api` passes
- [ ] All existing identity module tests still pass
