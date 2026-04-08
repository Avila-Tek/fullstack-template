# Spec: JWT ES256 Migration & Session Security Hardening

**Status:** Draft
**Author:** Claude (spec-driven-development)
**Date:** 2026-04-08
**Module:** `apps/api` — identity module (`infrastructure/better-auth/`)

---

## 1. Objective

Harden the identity module's token and session security by:

- Migrating JWT signing from **RS256** (RSA-2048) to **ES256** (ECDSA P-256) — smaller keys, faster verification, modern standard.
- Keeping the **15-minute JWT expiration** (already configured).
- Leveraging **Better Auth's native session-based refresh** as the token rotation mechanism — the session cookie is the long-lived credential, the JWT is the short-lived access token.
- Hardening session configuration to maximize security within Better Auth's native capabilities.
- Configuring **JWKS key rotation** with proper intervals and grace periods.

### Design philosophy

Better Auth's session model is already secure: httpOnly cookies, server-side session storage, configurable expiration. The session cookie effectively **is** the refresh token — clients exchange it for short-lived JWTs via `/token`. Rather than building a custom refresh-token-rotation layer that fights the framework, this spec maximizes security within Better Auth's native session + JWT architecture.

### Target users

- **API consumers** (Next.js frontends) that use session cookies + short-lived JWTs for service-to-service calls.
- **Security auditors** reviewing the auth stack.

### Token flow (no changes to architecture)

```
┌──────────┐     POST /sign-in/email      ┌──────────────┐
│  Client   │ ──────────────────────────▶  │  Better Auth  │
│ (Next.js) │  ◀─── Set-Cookie: session ── │  (Fastify)    │
└─────┬─────┘                              └───────────────┘
      │
      │  GET /token  (session cookie)
      │ ─────────────────────────────────▶  JWT plugin
      │  ◀─── { token: "ey..." }  ◀──────  signs ES256, 15 min
      │
      │  Authorization: Bearer <jwt>
      │ ─────────────────────────────────▶  API / external service
      │                                     verifies via JWKS
      │
      │  (JWT expires after 15 min)
      │  GET /token  (session cookie)       ← session acts as refresh
      │ ─────────────────────────────────▶  new JWT issued
```

---

## 2. Architecture

### What changes

| Component | Current | Target | Rationale |
|---|---|---|---|
| JWT algorithm | RS256 (RSA-2048) | **ES256** (ECDSA P-256) | Smaller keys (32 bytes vs 256 bytes), faster sign/verify, NIST-approved, modern standard |
| JWKS rotation | Not configured | **30-day rotation, 7-day grace** | Ensures key compromise has bounded impact |
| Session `updateAge` | 24 hours | **1 hour** | Session expiry extends more frequently — reduces window of stale sessions |
| Session `expiresIn` | 7 days | **7 days** (unchanged) | Reasonable for web apps with active use |
| Cookie cache `maxAge` | 5 minutes | **2 minutes** | Faster propagation of session revocation |
| Cookie cache `strategy` | `compact` (default) | **`compact`** (unchanged) | Sufficient for internal use; `jwe` adds overhead without meaningful security gain since cookie is httpOnly + secure |
| Session `freshAge` | Not configured | **5 minutes** | Sensitive operations (password change, 2FA toggle, email change) require fresh session |
| Secure cookies | Production only | Production only (unchanged) | Correct for dev/prod split |
| SameSite cookie | Not configured (default `lax`) | **`lax`** (explicit) | Prevents CSRF on cross-origin POST while allowing top-level navigation |

### What stays the same

- Session is the refresh mechanism (native Better Auth behavior).
- Session cookie value is stable for its lifetime (Better Auth doesn't rotate session tokens).
- `/token` endpoint exchanges a valid session for a 15-minute ES256 JWT.
- Device tracking, audit logging, rate limiting — all unchanged.
- Two-factor authentication plugin — unchanged.

---

## 3. Project Structure

```
apps/api/
├── src/modules/identity/
│   ├── infrastructure/
│   │   ├── better-auth/
│   │   │   └── auth.ts                     # UPDATED: ES256 config, session hardening, JWKS rotation
│   │   ├── persistence/
│   │   │   └── schemas/
│   │   │       └── jwks.schema.ts          # VERIFY: no changes needed (schema is algorithm-agnostic)
│   │   └── security/
│   │       └── jwt-verify.util.ts          # NEW: shared JWT verification helper (ES256 + JWKS)
├── test/modules/identity/                   # mirrors src/ structure
│   ├── infrastructure/
│   │   ├── better-auth/
│   │   │   └── jwt-es256.spec.ts           # NEW: ES256 signing, JWKS rotation, token expiry
│   │   └── security/
│   │       └── jwt-verify.util.spec.ts     # NEW: verifyIdentityJwt accepts ES256, rejects RS256
│   └── web/
│       └── session-hardening.spec.ts       # NEW: session config, freshness guard on controllers
```

Minimal file footprint — this is a configuration change, not a new feature.

---

## 4. Core Features & Acceptance Criteria

### 4.1 ES256 JWT Signing

**File:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

Change the JWT plugin's `keyPairConfig`:

```typescript
jwt({
  jwks: {
    keyPairConfig: { alg: 'ES256' },     // was: { alg: 'RS256', modulusLength: 2048 }
    jwksPath: '/.well-known/jwks.json',
    rotationInterval: 60 * 60 * 24 * 30, // 30 days
    gracePeriod: 60 * 60 * 24 * 7,       // 7 days — old key still valid for verification
  },
  jwt: {
    issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3002',
    audience: [process.env.CLIENT_URL ?? 'http://localhost:4200'],
    expirationTime: '15 minutes',
    definePayload: ({ user, session }) => ({
      email: user.email,
      emailVerified: user.emailVerified,
      sid: session.id,
      scope: '',
    }),
  },
}),
```

**AC:**
- [ ] JWT plugin uses `ES256` algorithm.
- [ ] `modulusLength` property removed (not applicable to EC keys).
- [ ] JWKS rotation configured: 30-day interval, 7-day grace period.
- [ ] Existing `definePayload`, `issuer`, `audience`, `expirationTime` unchanged.
- [ ] `/.well-known/jwks.json` endpoint returns EC public keys in JWK format.

---

### 4.2 JWKS Key Migration (RS256 → ES256)

Switching algorithms invalidates existing RS256 keys in the `jwks` table. Better Auth auto-generates new key pairs when the configured algorithm doesn't match stored keys.

**Migration strategy — graceful rotation:**

1. Deploy the ES256 config change.
2. Better Auth generates a new ES256 key pair on first `/token` request.
3. Old RS256 keys remain in the `jwks` table — they won't be selected for signing but stay available for verification during the grace period.
4. After 7 days (grace period), old keys expire and are no longer served via JWKS.
5. Any JWTs signed with RS256 naturally expire within 15 minutes — no active invalidation needed.

**AC:**
- [ ] No manual database migration required — Better Auth manages key lifecycle.
- [ ] After deployment, new JWTs are signed with ES256.
- [ ] Old RS256 JWTs (max 15 min old) remain valid until natural expiry.
- [ ] JWKS endpoint serves both old RS256 and new ES256 public keys during grace period.
- [ ] Downstream services using `createRemoteJWKSet` (jose) need no code changes — JWKS auto-discovery handles algorithm negotiation.

---

### 4.3 Session Hardening

**File:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

```typescript
session: {
  expiresIn: 60 * 60 * 24 * 7,   // 7 days (unchanged)
  updateAge: 60 * 60,             // 1 hour (was: 24 hours)
  freshAge: 60 * 5,               // 5 minutes — sensitive ops require fresh session
  cookieCache: {
    enabled: true,
    maxAge: 60 * 2,               // 2 minutes (was: 5 minutes)
  },
},
```

**AC:**
- [ ] `updateAge` reduced to 1 hour — session expiry extends on every hour of active use.
- [ ] `freshAge` set to 5 minutes — Better Auth returns `session.fresh: false` for sessions older than 5 minutes, enabling guards on sensitive operations.
- [ ] `cookieCache.maxAge` reduced to 2 minutes — revoked sessions are detected within 2 minutes max.
- [ ] `expiresIn` stays at 7 days — no change to session lifetime.

---

### 4.4 Explicit Cookie Security

**File:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

```typescript
advanced: {
  useSecureCookies: process.env.NODE_ENV === 'production',
  defaultCookieAttributes: {
    sameSite: 'lax',
    httpOnly: true,
    path: '/api/v1/auth',   // scope cookie to auth routes only
  },
},
```

**AC:**
- [ ] `sameSite: 'lax'` set explicitly (prevents CSRF on cross-origin POST).
- [ ] `httpOnly: true` set explicitly (prevents JS access — defense in depth even though Better Auth defaults this).
- [ ] `path` scoped to `/api/v1/auth` — cookie not sent on non-auth API calls (principle of least privilege).
- [ ] `secure: true` in production (via `useSecureCookies`).

---

### 4.5 Session Freshness Guard for Sensitive Operations

The `freshAge: 300` (5 minutes) config means Better Auth marks sessions as `fresh: false` after 5 minutes. Sensitive operations should check this.

**Operations that require a fresh session:**
- Password change (`ChangePasswordController`)
- 2FA enable/disable
- Email change
- Account deletion

**Implementation approach:** Check `session.fresh` in the controller/use-case before proceeding. If not fresh, return `403` with error code `IDENTITY_SESSION_NOT_FRESH` — the client must re-authenticate.

**AC:**
- [ ] `ChangePasswordController` checks session freshness before proceeding.
- [ ] New domain exception: `SessionNotFreshException` with code `IDENTITY_SESSION_NOT_FRESH`.
- [ ] HTTP mapping: `IDENTITY_SESSION_NOT_FRESH` → `403 Forbidden`.
- [ ] Error message in i18n catalog: `"Please re-authenticate to perform this action"`.
- [ ] 2FA, email change, and account deletion routes enforce the same check (existing or future controllers).

---

### 4.6 JWT Verification Utility

**File:** `apps/api/src/modules/identity/infrastructure/security/jwt-verify.util.ts`

A shared helper for downstream services or API guards that need to verify ES256 JWTs against the JWKS endpoint.

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';

interface IdentityJwtPayload extends JWTPayload {
  email: string;
  emailVerified: boolean;
  sid: string;
  scope: string;
}

const JWKS_URL = new URL(
  `${process.env.BETTER_AUTH_URL ?? 'http://localhost:3002'}/api/v1/auth/.well-known/jwks.json`,
);

const jwks = createRemoteJWKSet(JWKS_URL);

export async function verifyIdentityJwt(token: string): Promise<IdentityJwtPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3002',
    audience: process.env.CLIENT_URL ?? 'http://localhost:4200',
    algorithms: ['ES256'],
  });
  return payload as IdentityJwtPayload;
}
```

**AC:**
- [ ] Uses `jose` library (already a dependency).
- [ ] Restricts accepted algorithms to `['ES256']` — rejects RS256 after migration.
- [ ] Validates `issuer` and `audience` claims.
- [ ] Returns typed `IdentityJwtPayload`.
- [ ] `createRemoteJWKSet` caches keys automatically — no manual cache management.

---

### 4.7 Environment Variable Updates

| Variable | Change | Notes |
|---|---|---|
| `AUTH_PUBLIC_KEY` | **Remove** | No longer needed — JWKS endpoint provides public keys dynamically. |
| `AUTH_JWKS_URL` | Keep as-is | Already points to `/.well-known/jwks.json`. Downstream services use this. |
| `AUTH_ISSUER` | Keep as-is | No change. |
| `AUTH_AUDIENCE` | Keep as-is | No change. |

**AC:**
- [ ] `AUTH_PUBLIC_KEY` removed from `.env.example` and env validation schema if present.
- [ ] No new environment variables introduced.

---

## 5. Code Style & Conventions

Per project CLAUDE.md and API CLAUDE.md:

- **No `any`/`as any`** — strict TypeScript throughout.
- **Explicit return types** on all exported functions.
- **Immutable data** — spread/map, never mutate.
- **No `console.log`** — use Pino via logger.
- **Biome** for lint/format (`npx turbo lint`).
- **Domain exceptions** carry error codes, not messages.
- **File size** — changes are minimal; no file exceeds 400 lines.

---

## 6. Testing Strategy

All test files live in `apps/api/test/`, mirroring the `src/` folder structure.

### Unit tests (Vitest)

| Test file | What it covers |
|---|---|
| `test/modules/identity/infrastructure/better-auth/jwt-es256.spec.ts` | 1. JWT plugin config uses ES256 algorithm. 2. Generated tokens have correct `alg: ES256` header. 3. Token expiry is 15 minutes. 4. JWKS endpoint returns EC key (not RSA). |
| `test/modules/identity/infrastructure/security/jwt-verify.util.spec.ts` | 1. `verifyIdentityJwt` accepts valid ES256 tokens. 2. Rejects RS256 tokens. 3. Rejects expired tokens. 4. Validates issuer and audience claims. |
| `test/modules/identity/web/session-hardening.spec.ts` | 1. Session config has `updateAge: 3600`. 2. Session config has `freshAge: 300`. 3. Cookie cache `maxAge` is 120. 4. Sensitive operations reject stale sessions (mock `session.fresh = false`). |

### Integration tests

| Test file | What it covers |
|---|---|
| `test/modules/identity/infrastructure/better-auth/jwks-endpoint.integration.spec.ts` | `GET /api/v1/auth/.well-known/jwks.json` returns valid JWK Set with EC keys. |
| `test/modules/identity/infrastructure/better-auth/token-exchange.integration.spec.ts` | `GET /api/v1/auth/token` with valid session returns ES256-signed JWT verifiable against JWKS. |
| `test/modules/identity/web/session-freshness.integration.spec.ts` | `ChangePasswordController` returns 403 when session is not fresh. |

### Coverage target

- 80%+ on new/modified files in `src/modules/identity/infrastructure/better-auth/` and `src/modules/identity/infrastructure/security/`.

---

## 7. Boundaries

### Always do

- Restrict JWT verification to `algorithms: ['ES256']` — never accept unsigned or unexpected algorithms.
- Validate `issuer` and `audience` on every JWT verification.
- Use `httpOnly`, `secure`, `sameSite: lax` on all auth cookies.
- Enforce session freshness on sensitive operations.
- Let Better Auth manage JWKS key lifecycle — no manual key manipulation.

### Ask first

- Reducing session `expiresIn` below 7 days (impacts UX).
- Adding IP-binding to sessions (can break mobile users on cellular networks).
- Switching cookie cache strategy from `compact` to `jwe`.
- Adding the `bearer` plugin for non-cookie API clients.
- Changing `freshAge` threshold.

### Never do

- Accept `alg: none` or `alg: HS256` in JWT verification (algorithm confusion attacks).
- Store JWTs in `localStorage` — cookies only (httpOnly + secure).
- Build custom refresh token rotation outside Better Auth's session model.
- Manually insert/update rows in the `jwks` table.
- Expose JWKS private keys or auth secrets in logs or HTTP responses.
- Disable `useSecureCookies` in production.

---

## 8. Security Considerations

### Why ES256 over RS256

| Property | RS256 (current) | ES256 (target) |
|---|---|---|
| Key size | 2048-bit RSA | 256-bit EC (P-256) |
| Signature size | 256 bytes | 64 bytes |
| Sign speed | Slower | Faster |
| Verify speed | Faster (RSA verify is fast) | Comparable |
| NIST approved | Yes | Yes (FIPS 186-4) |
| Key in JWKS | ~450 bytes | ~120 bytes |
| Forward security | Equivalent | Equivalent |

ES256 provides equivalent security to RSA-3072 with dramatically smaller keys and signatures, making JWTs smaller and JWKS responses lighter.

### Session security model

- **Session cookie = refresh credential**: long-lived (7 days), httpOnly, secure, sameSite lax.
- **JWT = access credential**: short-lived (15 min), ES256-signed, verified via JWKS.
- **Session freshness**: sensitive operations require re-authentication within 5 minutes.
- **Revocation**: session revocation propagates within 2 minutes (cookie cache maxAge).
- **Device tracking**: existing device + audit log infrastructure detects new device logins.
- **Rate limiting**: 10 requests/60s on auth endpoints (existing).

### What this does NOT address (out of scope)

- Session token rotation (Better Auth doesn't support it natively — would require framework workaround).
- Refresh token as a separate entity (unnecessary given session-based architecture).
- Token binding / DPoP (future enhancement if needed for high-security contexts).

---

## 9. Implementation Order

| Phase | Tasks | Depends on |
|---|---|---|
| **P1 — ES256 config** | Update `keyPairConfig` to ES256. Remove `modulusLength`. Add `rotationInterval` + `gracePeriod`. | — |
| **P2 — Session hardening** | Update `updateAge`, `freshAge`, `cookieCache.maxAge`. Add `defaultCookieAttributes`. | — |
| **P3 — JWT verify utility** | Create `jwt-verify.util.ts` with ES256-only verification. | P1 |
| **P4 — Session freshness guard** | Add `SessionNotFreshException`. Update `ChangePasswordController` to check freshness. Add i18n message. | P2 |
| **P5 — Env cleanup** | Remove `AUTH_PUBLIC_KEY` from `.env.example` and validation if present. | P1 |
| **P6 — Tests** | Write unit + integration tests for ES256, session config, freshness guard. | P1–P4 |
| **P7 — Validate** | `npx turbo typecheck`, `npx turbo lint`, `npx turbo test --filter @repo/api`. | All |

---

## 10. Migration Checklist (Deployment)

1. [ ] Deploy ES256 config change to staging.
2. [ ] Verify `/.well-known/jwks.json` returns EC key with `"kty": "EC"`, `"crv": "P-256"`.
3. [ ] Verify `/token` returns JWT with `"alg": "ES256"` in header.
4. [ ] Verify downstream services can validate new JWTs via JWKS.
5. [ ] Wait 15 minutes — all old RS256 JWTs have expired.
6. [ ] Verify old RS256 keys still appear in JWKS during grace period.
7. [ ] Deploy to production.
8. [ ] Monitor auth metrics for elevated error rates.

---

## 11. Open Questions

1. **Cookie `path` scoping** — should the session cookie be scoped to `/api/v1/auth` (more restrictive) or `/api/v1` (allows other API routes to read it)? Current default is `/` (broadest).
2. **Session lifetime for admin app** — should `apps/admin` have a shorter session lifetime (e.g., 1 day) for stricter security?
3. **Downstream JWT consumers** — are there services beyond the Next.js frontends that verify JWTs? They need to update their JWKS cache after migration.
4. **`AUTH_PUBLIC_KEY` usage** — is this env var used anywhere outside the identity module? Need to verify before removing.
