# Todo: JWT ES256 Migration & Session Security Hardening

**Plan:** `docs/plans/jwt-es256-session-hardening-plan.md`
**Spec:** `docs/specs/jwt-es256-session-hardening.md`
**Status:** ✅ COMPLETE — committed `62e3b7f` on `feat/auth-integration-template`

---

## Phase 1 — ES256 config (P1) + Session hardening (P2) — parallel

- [x] **T1.1** Write ES256 config tests (RED) — `test/modules/identity/infrastructure/better-auth/jwt-es256.spec.ts`
- [x] **T1.2** Implement ES256 config in `auth.ts` (GREEN) — extract `JWT_JWKS_CONFIG` to `auth-config.ts`, change alg to ES256, add rotation/grace
- [x] **T1.3** Run tests — confirm T1 green
- [x] **T2.1** Write session hardening tests (RED) — `test/modules/identity/infrastructure/better-auth/session-hardening.spec.ts`
- [x] **T2.2** Implement session hardening in `auth.ts` (GREEN) — extract `SESSION_CONFIG`/`ADVANCED_CONFIG` to `auth-config.ts`, update values
- [x] **T2.3** Run tests — confirm T2 green

### Checkpoint 1
- [x] `npx turbo typecheck --filter @repo/api` passes
- [x] All T1 + T2 tests pass

---

## Phase 2 — JWT verify (P3) + Freshness guard (P4) + Env cleanup (P5) — parallel

- [x] **T3.1** Write JWT verify tests (RED) — `test/modules/identity/infrastructure/security/jwt-verify.util.spec.ts`
- [x] **T3.2** Implement `jwt-verify.util.ts` (GREEN) — ES256-only, `jose`, typed payload
- [x] **T3.3** Run tests — confirm T3 green
- [x] **T4.1** Write freshness guard tests (RED) — `test/modules/identity/infrastructure/web/controllers/change-password-freshness.spec.ts`
- [x] **T4.2** Create `SessionNotFreshException` + i18n message + HTTP 403 mapping
- [x] **T4.3** Update `ChangePasswordController` — expand SessionData type, add freshness check
- [x] **T4.4** Run tests — confirm T4 green
- [x] **T5.1** Remove `assertEnv('AUTH_PUBLIC_KEY')` from `env.ts`
- [x] **T5.2** Update virtual controller Swagger docs: "RS256" → "ES256"
- [x] **T5.3** Update `jwks.schema.ts` comment: "RSA-2048" → "ECDSA P-256"

### Checkpoint 2
- [x] `npx turbo typecheck --filter @repo/api` passes
- [x] All T3 + T4 + T5 tests pass

---

## Phase 3 — Full validation (P6)

- [x] **T6.1** `npx turbo typecheck --filter @repo/api` — passes
- [x] **T6.2** `npx turbo lint --filter @repo/api` — source files clean; pre-existing `dist/` lint failures unrelated to this work
- [x] **T6.3** `npm -C apps/api test` — **113 tests / 23 files, all passing** (17 new tests added)
- [x] **T6.4** Verify: no `any`/`as any`, no `console.log` in changed files

---

## Decisions Made

| # | Question | Decision |
|---|----------|----------|
| Q1 | Cookie `path` scoping? | **`/api/v1`** — spec suggested `/api/v1/auth` but that breaks `ChangePasswordController` at `/api/v1/change-password` |
| Q2 | Where to export config constants? | **`auth-config.ts`** — `auth.ts` throws at load time if `DATABASE_URL` absent; separate file allows unit tests to import constants without side effects |

## Out of Scope

- 2FA freshness guard (Better Auth middleware — needs hook-based approach)
- Email change / account deletion freshness guard (controllers don't exist yet)
- Extract reusable `FreshSessionGuard` (only 1 controller needs it now)
