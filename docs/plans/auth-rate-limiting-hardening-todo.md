# Todo: Auth Rate-Limiting Hardening

**Plan**: `docs/plans/auth-rate-limiting-hardening-plan.md`  
**Spec**: `docs/specs/SPEC-auth-hardening.md`  
**Status**: Not started

---

## Phase 1 — Infrastructure plumbing (T1, T2, T3 — parallelizable)

- [ ] **T1.1** Add `assertEnv('REDIS_URL')` to `apps/api/src/env.ts`
- [ ] **T1.2** Add `trust proxy` block to `apps/api/src/main.ts` (qa/prod only)
- [ ] **T2.1** Create `apps/api/src/shared/utils/resolve-client-ip.ts`
- [ ] **T2.2** Write unit tests — `apps/api/test/shared/utils/resolve-client-ip.spec.ts` (RED → GREEN)
- [ ] **T3.1** Fix `secondaryStorage.set` in `auth.ts` — apply 86400 s fallback TTL when `ttl` is falsy
- [ ] **T3.2** Convert `secondaryStorage.delete` in `auth.ts` to `async/await`

### Checkpoint 1
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] `npm -C apps/api test` passes (all existing tests + T2 unit tests)

---

## Phase 2 — Middleware hardening (T4 — depends on T2)

- [ ] **T4.1** Export `signUpBeforeHookBody` from `apps/api/src/modules/identity/infrastructure/better-auth/hooks/sign-up.hooks.ts`
- [ ] **T4.2** Export `deriveErrorType` from `apps/api/src/modules/identity/infrastructure/better-auth/hooks/sign-in.hooks.ts`
- [ ] **T4.3** Update `signin-ip-rate-limit.middleware.spec.ts` — replace `incr`/`expire` mocks with `eval` mock; add CF header test (RED)
- [ ] **T4.4** Write `apps/api/test/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware.spec.ts` (RED)
- [ ] **T4.5** Refactor `signin-ip-rate-limit.middleware.ts` — Lua atomic counter, `@Inject(REDIS_CLIENT)`, `resolveClientIp`, dynamic message
- [ ] **T4.6** Refactor `signup-ip-rate-limit.middleware.ts` — same fixes as T4.5
- [ ] **T4.7** Update `identity.module.ts` — import `RedisModule`, add both middlewares to `providers`
- [ ] **T4.8** Confirm T4.3 + T4.4 tests GREEN

### Checkpoint 2
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] All signin + signup middleware tests pass
- [ ] No `@Optional()` in either middleware file
- [ ] No `new Redis(...)` in either middleware file

---

## Phase 3 — Per-account lockout (T5)

- [ ] **T5.1** Write `apps/api/test/modules/identity/infrastructure/security/account-lockout.service.spec.ts` (RED)
- [ ] **T5.2** Implement `apps/api/src/modules/identity/infrastructure/security/account-lockout.service.ts`
- [ ] **T5.3** Confirm T5.1 tests GREEN
- [ ] **T5.4** Wire `AccountLockoutService` into `auth.ts` — compose `before` hook (isLocked check) + `after` hook (recordFailure / recordSuccess)

### Checkpoint 3
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] AccountLockoutService tests pass
- [ ] `before` hook in `auth.ts` checks lockout on `/sign-in/email` path
- [ ] `after` hook in `auth.ts` records failure on `INVALID_EMAIL_OR_PASSWORD`, success on session created

---

## Phase 4 — Final validation

- [ ] **T6.1** `npx turbo typecheck --filter @repo/api` — clean
- [ ] **T6.2** `npx turbo lint --filter @repo/api` — clean (run `lint:fix` if needed)
- [ ] **T6.3** `npm -C apps/api test` — all tests pass
- [ ] **T6.4** No `any`/`as any`, no `console.log`, no `new Redis(...)` inside middlewares

---

## Issues → Tasks Mapping

| Issue | Severity | Task(s) |
|-------|----------|---------|
| #1 — non-atomic incr + expire | Critical | T4.5, T4.6 |
| #2 — double Redis connection / @Optional fallback | Critical | T4.5, T4.6, T4.7 |
| #3 — no per-account lockout | Important | T5.1–T5.4 |
| #4 — REDIS_URL not validated at startup | Important | T1.1 |
| #5 — trust proxy not configured | Important | T1.2 |
| #6 — IP from req.ip only (no CF header) | Important | T2.1, T2.2, T4.5, T4.6 |
| #7 — secondaryStorage.set no default TTL | Suggestion | T3.1 |
| #8 — TOO_MANY_MESSAGE hardcodes "1 hour" | Suggestion | T4.5, T4.6 |
| #9 — secondaryStorage.delete uses .then() | Suggestion | T3.2 |
