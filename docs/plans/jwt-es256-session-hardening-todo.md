# Todo: JWT ES256 Migration & Session Security Hardening

**Plan:** `docs/plans/jwt-es256-session-hardening-plan.md`
**Spec:** `docs/specs/jwt-es256-session-hardening.md`

---

## Phase 1 — ES256 config (P1) + Session hardening (P2) — parallel

- [ ] **T1.1** Write ES256 config tests (RED) — `test/modules/identity/infrastructure/better-auth/jwt-es256.spec.ts`
- [ ] **T1.2** Implement ES256 config in `auth.ts` (GREEN) — extract `JWT_JWKS_CONFIG`, change alg to ES256, add rotation/grace
- [ ] **T1.3** Run tests — confirm T1 green
- [ ] **T2.1** Write session hardening tests (RED) — `test/modules/identity/infrastructure/better-auth/session-hardening.spec.ts`
- [ ] **T2.2** Implement session hardening in `auth.ts` (GREEN) — extract `SESSION_CONFIG`/`ADVANCED_CONFIG`, update values
- [ ] **T2.3** Run tests — confirm T2 green

### Checkpoint 1
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] All T1 + T2 tests pass

---

## Phase 2 — JWT verify (P3) + Freshness guard (P4) + Env cleanup (P5) — parallel

- [ ] **T3.1** Write JWT verify tests (RED) — `test/modules/identity/infrastructure/security/jwt-verify.util.spec.ts`
- [ ] **T3.2** Implement `jwt-verify.util.ts` (GREEN) — ES256-only, `jose`, typed payload
- [ ] **T3.3** Run tests — confirm T3 green
- [ ] **T4.1** Write freshness guard tests (RED) — `test/modules/identity/infrastructure/web/controllers/change-password-freshness.spec.ts`
- [ ] **T4.2** Create `SessionNotFreshException` + i18n message + HTTP 403 mapping
- [ ] **T4.3** Update `ChangePasswordController` — expand SessionData type, add freshness check
- [ ] **T4.4** Run tests — confirm T4 green
- [ ] **T5.1** Remove `assertEnv('AUTH_PUBLIC_KEY')` from `env.ts`
- [ ] **T5.2** Update virtual controller Swagger docs: "RS256" → "ES256"
- [ ] **T5.3** Update `jwks.schema.ts` comment: "RSA-2048" → "ECDSA P-256"

### Checkpoint 2
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] All T3 + T4 + T5 tests pass

---

## Phase 3 — Full validation (P6)

- [ ] **T6.1** `npx turbo typecheck --filter @repo/api` — passes
- [ ] **T6.2** `npx turbo lint --filter @repo/api` — passes (fix with `lint:fix` if needed)
- [ ] **T6.3** `npm -C apps/api test` — all tests pass
- [ ] **T6.4** Verify: no `any`/`as any`, no `console.log` in changed files

---

## Decisions Made

| # | Question | Decision |
|---|----------|----------|
| Q1 | Cookie `path` scoping? | **`/api/v1`** — spec suggested `/api/v1/auth` but that breaks `ChangePasswordController` at `/api/v1/change-password` |

## Out of Scope

- 2FA freshness guard (Better Auth middleware — needs hook-based approach)
- Email change / account deletion freshness guard (controllers don't exist yet)
- Extract reusable `FreshSessionGuard` (only 1 controller needs it now)
