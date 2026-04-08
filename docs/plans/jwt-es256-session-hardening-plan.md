# Plan: JWT ES256 Migration & Session Security Hardening

**Spec:** `docs/specs/jwt-es256-session-hardening.md`
**Branch:** `feat/auth-integration-template`
**Date:** 2026-04-08

---

## Context

The identity module uses RS256 (RSA-2048) for JWT signing with no JWKS key rotation and relaxed session settings. This plan migrates to ES256 (ECDSA P-256 — smaller keys, faster verification), adds JWKS key rotation (30-day cycle, 7-day grace), hardens session timing parameters, and introduces session freshness enforcement on sensitive operations.

---

## Dependency Graph

```
P1 (ES256 config) ──────────┬──▶ P3 (JWT verify utility)
                             └──▶ P5 (env cleanup + docs)

P2 (session hardening) ──────┬──▶ P4 (freshness guard)

P1 ∥ P2  (parallel — different config sections of auth.ts)
P3 ∥ P4 ∥ P5  (parallel — after their deps)
P6 (validation) — depends on ALL above
```

---

## Assumptions

1. Better Auth `^1.6.0` supports `{ alg: 'ES256' }` in `keyPairConfig` (confirmed in `better-auth/dist/plugins/jwt/types.d.mts` — discriminated union).
2. `rotationInterval` and `gracePeriod` are supported JWKS options (confirmed in types).
3. `freshAge` is supported in session config (confirmed in Better Auth init options).
4. `@Session()` decorator from `@thallesp/nestjs-better-auth` returns `{ session: { id, createdAt, ... }, user: { id, ... } }`.
5. `jose` v6.2.1 is already installed — no new dependencies needed.
6. JWKS schema (`jwks.schema.ts`) is algorithm-agnostic (stores JWK JSON text) — no DB migration needed.
7. Better Auth auto-generates new ES256 keys when the configured algorithm doesn't match stored keys.

## Risk: Cookie `path` Scoping

**CRITICAL FINDING:** The spec suggests `path: '/api/v1/auth'` for cookie scope. However:
- `ChangePasswordController` route = `api/v1/change-password` (global prefix `api/v1` + `@Controller('change-password')`)
- A cookie scoped to `/api/v1/auth` will NOT be sent to `/api/v1/change-password`
- This would **break session resolution** for the `ChangePasswordController`

**Recommendation:** Use `path: '/api/v1'` instead of `/api/v1/auth`. This covers all API routes while still being tighter than `/`.

---

## Tasks

### T1 — ES256 JWT config (P1)

**Files:**
- MODIFY: `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` (lines 171-175)
- NEW: `apps/api/test/modules/identity/infrastructure/better-auth/jwt-es256.spec.ts`

**Changes:**
1. Extract JWT JWKS config into an exported constant `JWT_JWKS_CONFIG` for testability
2. Change `keyPairConfig` from `{ alg: 'RS256', modulusLength: 2048 }` to `{ alg: 'ES256' }`
3. Add `rotationInterval: 60 * 60 * 24 * 30` (30 days)
4. Add `gracePeriod: 60 * 60 * 24 * 7` (7 days)

**TDD (write test first):**
- `JWT_JWKS_CONFIG.keyPairConfig.alg` equals `'ES256'`
- No `modulusLength` property present
- `rotationInterval` equals `2592000`
- `gracePeriod` equals `604800`

**AC:**
- [ ] JWT plugin uses ES256 algorithm
- [ ] `modulusLength` removed
- [ ] JWKS rotation: 30-day interval, 7-day grace
- [ ] Existing payload, issuer, audience, expiration unchanged
- [ ] Tests pass

**Verify:** `npm -C apps/api test -- jwt-es256` + `npx turbo typecheck --filter @repo/api`

---

### T2 — Session hardening (P2) — parallel with T1

**Files:**
- MODIFY: `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` (lines 197-208)
- NEW: `apps/api/test/modules/identity/infrastructure/better-auth/session-hardening.spec.ts`

**Changes:**
1. Extract session config + advanced config into exported constants for testability
2. `updateAge`: `60 * 60 * 24` → `60 * 60` (1 hour)
3. Add `freshAge: 60 * 5` (5 minutes)
4. `cookieCache.maxAge`: `60 * 5` → `60 * 2` (2 minutes)
5. Add `defaultCookieAttributes: { sameSite: 'lax', httpOnly: true, path: '/api/v1' }`

**TDD (write test first):**
- `SESSION_CONFIG.updateAge` equals `3600`
- `SESSION_CONFIG.freshAge` equals `300`
- `SESSION_CONFIG.cookieCache.maxAge` equals `120`
- `SESSION_CONFIG.expiresIn` equals `604800` (unchanged)
- `ADVANCED_CONFIG.defaultCookieAttributes.sameSite` equals `'lax'`
- `ADVANCED_CONFIG.defaultCookieAttributes.httpOnly` equals `true`
- `ADVANCED_CONFIG.defaultCookieAttributes.path` equals `'/api/v1'`

**AC:**
- [ ] `updateAge` reduced to 1 hour
- [ ] `freshAge` set to 5 minutes
- [ ] `cookieCache.maxAge` reduced to 2 minutes
- [ ] `expiresIn` stays at 7 days
- [ ] Cookie attributes set explicitly
- [ ] Tests pass

**Verify:** `npm -C apps/api test -- session-hardening` + `npx turbo typecheck --filter @repo/api`

---

### CHECKPOINT 1 — P1 + P2 complete

- [ ] `auth.ts` has ES256 + JWKS rotation + hardened session + cookie attributes
- [ ] All unit tests pass
- [ ] Type checking passes

---

### T3 — JWT verification utility (P3) — depends on T1

**Files:**
- NEW: `apps/api/src/modules/identity/infrastructure/security/jwt-verify.util.ts`
- NEW: `apps/api/test/modules/identity/infrastructure/security/jwt-verify.util.spec.ts`

**Implementation:**
- Uses `jose` `createRemoteJWKSet` + `jwtVerify`
- Exports `IdentityJwtPayload` interface (`email`, `emailVerified`, `sid`, `scope`)
- Accepts optional `jwks` param for testability (default: remote JWKS set from `BETTER_AUTH_URL`)
- Restricts algorithms to `['ES256']`
- Validates `issuer` and `audience`

**TDD (write test first):** Using `jose` `generateKeyPair('ES256')` + `SignJWT`:
1. Accepts valid ES256 token → returns `IdentityJwtPayload`
2. Rejects RS256 token → throws
3. Rejects expired token → throws
4. Rejects wrong issuer → throws
5. Rejects wrong audience → throws

**AC:**
- [ ] Uses `jose` (already installed `^6.2.1`)
- [ ] Restricts algorithms to `['ES256']`
- [ ] Validates issuer and audience
- [ ] Returns typed `IdentityJwtPayload`
- [ ] Testable via injected JWKS set
- [ ] Tests pass

**Verify:** `npm -C apps/api test -- jwt-verify`

---

### T4 — Session freshness guard (P4) — depends on T2

**Files:**
- NEW: `apps/api/src/modules/identity/domain/exceptions/session-not-fresh.exception.ts`
- MODIFY: `apps/api/src/modules/identity/infrastructure/i18n/messages.ts`
- MODIFY: `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`
- MODIFY: `apps/api/src/modules/identity/infrastructure/web/controllers/change-password.controller.ts`
- NEW: `apps/api/test/modules/identity/infrastructure/web/controllers/change-password-freshness.spec.ts`

**Sub-steps:**

**T4a — Domain + i18n + HTTP mapping:**
- Create `SessionNotFreshException` extending `DomainException` with code `IDENTITY_SESSION_NOT_FRESH`
  (pattern: `apps/api/src/modules/identity/domain/exceptions/invalid-credentials.exception.ts`)
- Add `'IDENTITY_SESSION_NOT_FRESH'` to `IdentityErrorCode` union + translations in `messages.ts`
- Add `IDENTITY_SESSION_NOT_FRESH: 403` to `DomainToHttpMapper.STATUS`

**T4b — Controller update:**
- Expand `SessionData` type to include `session: { createdAt: Date }`
- Add freshness check before use case:
  ```
  const createdAt = new Date(session.session.createdAt).getTime();
  const isFresh = Date.now() - createdAt < 300_000; // 5 minutes
  if (!isFresh) throw new SessionNotFreshException();
  ```
- Add `403` to `@ApiErrorResponses`

**TDD (write test first):**
1. Throws `SessionNotFreshException` when session > 5 min old
2. Proceeds when session is fresh (< 5 min old)
3. Still throws `UnauthorizedException` when session is null

**Design note:** Freshness check lives in the controller (transport concern). A reusable `FreshSessionGuard` can be extracted later when multiple controllers need it.

**AC:**
- [ ] `SessionNotFreshException` with code `IDENTITY_SESSION_NOT_FRESH`
- [ ] HTTP mapping → `403 Forbidden`
- [ ] i18n: EN + ES translations
- [ ] `ChangePasswordController` rejects stale sessions
- [ ] Fresh sessions proceed normally
- [ ] Tests pass

**Verify:** `npm -C apps/api test -- change-password-freshness`

---

### T5 — Environment cleanup + docs (P5) — depends on T1

**Files:**
- MODIFY: `apps/api/src/env.ts` (remove `assertEnv('AUTH_PUBLIC_KEY')`)
- MODIFY: `apps/api/src/modules/identity/infrastructure/web/controllers/better-auth-virtual.controller.ts` ("RS256" → "ES256")
- MODIFY: `apps/api/src/modules/identity/infrastructure/persistence/schemas/jwks.schema.ts` (comment: "RSA-2048" → "ECDSA P-256")

**AC:**
- [ ] `AUTH_PUBLIC_KEY` assertion removed from `env.ts`
- [ ] Swagger docs reference ES256
- [ ] Schema comment updated

**Verify:** `npx turbo typecheck --filter @repo/api`

---

### CHECKPOINT 2 — All implementation complete

- [ ] ES256 signing configured
- [ ] JWKS rotation: 30d rotation, 7d grace
- [ ] Session: 1h updateAge, 5min freshAge, 2min cookie cache
- [ ] Cookie: sameSite lax, httpOnly, path `/api/v1`
- [ ] JWT verify utility (ES256-only)
- [ ] Freshness guard on `ChangePasswordController`
- [ ] `AUTH_PUBLIC_KEY` removed
- [ ] Swagger + schema docs updated

---

### T6 — Full validation (P6) — depends on all

```bash
npx turbo typecheck --filter @repo/api
npx turbo lint --filter @repo/api       # fix: npx turbo lint:fix --filter @repo/api
npm -C apps/api test
```

**AC:**
- [ ] All type checks pass
- [ ] All lint checks pass
- [ ] All tests pass (existing + new)
- [ ] No `any`/`as any` in changed files
- [ ] No `console.log` in changed files

---

## Out of Scope (Future Tasks)

1. **2FA freshness guard** — enable/disable handled by Better Auth middleware; needs hook-based approach
2. **Email change freshness guard** — no controller exists yet
3. **Account deletion freshness guard** — no controller exists yet
4. **Extract `FreshSessionGuard`** — when 2+ controllers need freshness checking
5. **Cookie `path: '/api/v1/auth'`** — breaks `ChangePasswordController`; using `/api/v1` instead

---

## Files Summary

| File | Action | Task |
|------|--------|------|
| `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` | MODIFY | T1, T2 |
| `apps/api/src/modules/identity/infrastructure/security/jwt-verify.util.ts` | NEW | T3 |
| `apps/api/src/modules/identity/domain/exceptions/session-not-fresh.exception.ts` | NEW | T4 |
| `apps/api/src/modules/identity/infrastructure/i18n/messages.ts` | MODIFY | T4 |
| `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts` | MODIFY | T4 |
| `apps/api/src/modules/identity/infrastructure/web/controllers/change-password.controller.ts` | MODIFY | T4 |
| `apps/api/src/env.ts` | MODIFY | T5 |
| `apps/api/src/modules/identity/infrastructure/web/controllers/better-auth-virtual.controller.ts` | MODIFY | T5 |
| `apps/api/src/modules/identity/infrastructure/persistence/schemas/jwks.schema.ts` | MODIFY | T5 |
| `apps/api/test/modules/identity/infrastructure/better-auth/jwt-es256.spec.ts` | NEW | T1 |
| `apps/api/test/modules/identity/infrastructure/better-auth/session-hardening.spec.ts` | NEW | T2 |
| `apps/api/test/modules/identity/infrastructure/security/jwt-verify.util.spec.ts` | NEW | T3 |
| `apps/api/test/modules/identity/infrastructure/web/controllers/change-password-freshness.spec.ts` | NEW | T4 |

**Existing code to reuse:**
- `DomainException` — `apps/api/src/shared/domain-utils.ts`
- Exception pattern — `apps/api/src/modules/identity/domain/exceptions/invalid-credentials.exception.ts`
- i18n catalog — `apps/api/src/modules/identity/infrastructure/i18n/messages.ts`
- HTTP mapper — `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`
