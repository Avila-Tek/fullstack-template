# Plan: Better Auth i18n Integration

**Spec:** `docs/specs/better-auth-i18n-integration.md`
**Branch:** `feat/auth-integration-template`
**Date:** 2026-04-08

---

## Dependency Graph

```
T1 (install package)
 └─► T2 (translation catalog)
      └─► T3 (plugin wiring in auth.ts)
           └─► T4 (unit tests — catalog completeness)
                └─► T5 (integration tests — i18n behavior)
                     └─► T6 (validation & non-regression)
```

All tasks are sequential — each depends on the previous one. No parallelism possible because each slice builds on the prior artifact.

---

## Assumptions

1. `@better-auth/i18n` is compatible with `better-auth@^1.6.0` (currently installed).
2. The i18n plugin accepts `detection: ['header']` to use `Accept-Language` (per better-auth docs).
3. The plugin returns `originalMessage` alongside localized `message` in error responses.
4. No changes needed to `DomainExceptionFilter`, `HttpExceptionFilter`, or any NestJS filter.
5. Virtual controllers need no modification (they're Swagger-only, responses come from better-auth middleware).

---

## Phase 1: Foundation (T1–T2)

### T1 — Install `@better-auth/i18n`

**What:** Add the package to `apps/api`.

**Steps:**
1. Run `npm -C apps/api install @better-auth/i18n`
2. Verify it appears in `apps/api/package.json` under `dependencies`
3. Verify `npm ls @better-auth/i18n` resolves without peer-dep warnings

**Acceptance criteria:**
- `@better-auth/i18n` listed in `apps/api/package.json`
- No peer dependency conflicts with `better-auth@^1.6.0`

**Verification:**
```bash
npm -C apps/api ls @better-auth/i18n
```

---

### T2 — Create Spanish translation catalog

**What:** Create the `i18n/` directory and `translations.ts` with all required Spanish translations.

**Files:**
- `apps/api/src/modules/identity/infrastructure/better-auth/i18n/translations.ts` (NEW)
- `apps/api/src/modules/identity/infrastructure/better-auth/i18n/index.ts` (NEW)

**Steps:**
1. Create `i18n/` directory under `apps/api/src/modules/identity/infrastructure/better-auth/`
2. Write `translations.ts` with `esBetterAuthTranslations` covering:
   - All "must translate" codes (section 3.3 of spec): auth, user, email, session, token, 2FA
   - All "should translate" codes: password-already-set, email-can-not-be-updated, etc.
   - Server errors (`FAILED_TO_*`) mapped to generic "Ocurrió un error inesperado."
3. Write `index.ts` re-exporting the translation object
4. Export type `Record<string, string>` — no coupling to better-auth internals

**Acceptance criteria:**
- Every key listed in spec section 3.3 "must translate" has an `es` entry
- Every key listed in spec section 3.3 "should translate" has an `es` entry
- Server error codes map to a generic message (never leak internals)
- No empty string values
- File passes typecheck

**Verification:**
```bash
npx turbo typecheck --filter @repo/api
```

---

## Checkpoint 1

Pause for review. Verify:
- [ ] Package installed without conflicts
- [ ] Translation catalog matches spec section 3.3 exhaustively
- [ ] Typecheck passes

---

## Phase 2: Wiring (T3)

### T3 — Wire i18n plugin into `auth.ts`

**What:** Add the `i18n()` plugin to the existing better-auth configuration.

**Files:**
- `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` (MODIFIED)

**Steps:**
1. Import `i18n` from `@better-auth/i18n`
2. Import `esBetterAuthTranslations` from `./i18n/translations`
3. Add `i18n({ defaultLocale: 'en', detection: ['header'], translations: { es: esBetterAuthTranslations } })` to the `plugins` array
4. Place it after existing plugins (jwt, twoFactor) — order should not matter but keeps the diff clean

**Acceptance criteria:**
- Plugin registered in `auth.ts` plugins array
- `defaultLocale` is `'en'`
- Detection method is `['header']` (Accept-Language)
- Spanish translations passed under `es` key
- Existing plugins (jwt, twoFactor) remain unchanged
- No other files modified

**Verification:**
```bash
npx turbo typecheck --filter @repo/api
npx turbo lint --filter @repo/api
```

---

## Checkpoint 2

Pause for review. Verify:
- [ ] `auth.ts` diff is minimal — only i18n import + plugin addition
- [ ] No changes to hooks, filters, or controllers
- [ ] Typecheck + lint pass

---

## Phase 3: Testing (T4–T5)

### T4 — Unit test: translation catalog completeness

**What:** Write a unit test that validates all required error codes have Spanish translations.

**Files:**
- `apps/api/test/modules/identity/infrastructure/better-auth/i18n/translations.spec.ts` (NEW)

**Steps:**
1. Define the "must translate" set as an array of string literals (from spec section 3.3)
2. Define the "should translate" set similarly
3. Test: every key in "must translate" exists in `esBetterAuthTranslations` and is a non-empty string
4. Test: every key in "should translate" exists in `esBetterAuthTranslations` and is a non-empty string
5. Test: no value is identical to its key (catch copy-paste of English keys as values)
6. Test: no value contains only ASCII (basic heuristic — Spanish translations should contain accented characters or ñ for most entries)

**Acceptance criteria:**
- All "must translate" keys present with non-empty Spanish strings
- All "should translate" keys present with non-empty Spanish strings
- Test passes: `npm -C apps/api test -- --run translations.spec`

**Verification:**
```bash
npm -C apps/api test -- --run translations.spec
```

---

### T5 — Integration test: i18n plugin behavior

**What:** Test that better-auth endpoints return localized error messages based on `Accept-Language`.

**Files:**
- `apps/api/test/modules/identity/infrastructure/better-auth/i18n/i18n-integration.spec.ts` (NEW)

**Steps:**
1. Set up a test better-auth instance (or use the existing test harness if one exists)
2. Test cases (from spec section 6.2):
   - Sign-in wrong password + `Accept-Language: es` → Spanish message
   - Sign-in wrong password + `Accept-Language: en` → English message
   - Sign-in wrong password + no header → English (default)
   - Sign-in wrong password + `Accept-Language: fr` → English (fallback)
   - Verify `originalMessage` field is present and in English
3. If a full integration test harness is too complex, create a focused test that validates the i18n plugin configuration by importing the auth instance and checking plugin registration

**Acceptance criteria:**
- At least the sign-in error locale detection tests pass
- `originalMessage` field verified
- Unsupported locale fallback verified

**Verification:**
```bash
npm -C apps/api test -- --run i18n-integration.spec
```

**Risk note:** Integration tests against better-auth may require a running database. If the test harness doesn't support this, downscope to configuration validation tests and document the manual verification steps.

---

## Checkpoint 3

Pause for review. Verify:
- [ ] Unit tests pass
- [ ] Integration tests pass (or manual verification documented)
- [ ] No existing tests broken

---

## Phase 4: Validation & Cleanup (T6)

### T6 — Full validation and non-regression

**What:** Run the complete validation suite and verify nothing is broken.

**Steps:**
1. `npx turbo typecheck --filter @repo/api` — must pass
2. `npx turbo lint --filter @repo/api` — must pass (fix with `lint:fix` if needed)
3. `npm -C apps/api test` — all existing tests must still pass
4. Verify no changes to:
   - `DomainExceptionFilter`
   - `HttpExceptionFilter`
   - `AllExceptionsFilter`
   - `domain-messages.ts`
   - `messages.ts` (identity domain messages)
   - Any virtual controller
5. Review the complete diff: only expected files should be modified/created

**Acceptance criteria (maps to spec ACs):**
- AC-1: `@better-auth/i18n` in `package.json` ✓
- AC-4: All "must translate" codes have `es` translations ✓
- AC-7: Domain exception responses unchanged ✓
- AC-8: Typecheck passes ✓
- AC-9: Lint passes ✓
- AC-10: Translation catalog unit test passes ✓

**Note on AC-2, AC-3, AC-5, AC-6:** These require a running server with database. They are covered by integration tests (T5) if the harness supports it, or must be verified manually during development.

**Verification:**
```bash
npx turbo typecheck --filter @repo/api
npx turbo lint --filter @repo/api
npm -C apps/api test
```

---

## Files Changed Summary

| File | Action | Task |
|------|--------|------|
| `apps/api/package.json` | MODIFIED (new dep) | T1 |
| `apps/api/package-lock.json` | MODIFIED (auto) | T1 |
| `.../better-auth/i18n/translations.ts` | NEW | T2 |
| `.../better-auth/i18n/index.ts` | NEW | T2 |
| `.../better-auth/auth.ts` | MODIFIED (+4 lines) | T3 |
| `test/.../i18n/translations.spec.ts` | NEW | T4 |
| `test/.../i18n/i18n-integration.spec.ts` | NEW | T5 |

**Total production files changed:** 1 modified, 2 new
**Total test files:** 2 new

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| `@better-auth/i18n` API differs from spec assumptions | Low | Verify import/config shape after install (T1) |
| Integration tests need running DB | Medium | Downscope to config validation if no test DB harness |
| New better-auth version adds error codes not in catalog | Future | T4 unit test can be extended to compare against `BASE_ERROR_CODES` export |
