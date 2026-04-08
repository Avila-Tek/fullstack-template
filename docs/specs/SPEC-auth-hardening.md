# Spec: Auth Rate-Limiting Hardening

**Branch**: `feat/auth-integration-template`  
**Scope**: `apps/api` — `IdentityModule` and `better-auth` infrastructure only  
**Status**: Draft — pending approval

---

## 1. Objective

Fix a set of correctness, architecture, and security issues in the current
IP-based rate-limiting middleware and Better Auth secondary-storage wiring,
then add per-account lockout to close the credential-stuffing gap that
IP-only rate limiting leaves open.

**Target users**: internal — affects no user-visible API contract.  
**Non-goal**: Cloudflare WAF configuration (out of scope; app layer only).

---

## 2. Problem Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | `incr` + `expire` are two separate commands — if the process crashes between them the key has no TTL and blocks that IP forever | Critical |
| 2 | Both middlewares ignore the injected `REDIS_CLIENT` and open a second connection on every start (`@Optional()` + fallback `new Redis(...)`) because `RedisModule` is not imported in `IdentityModule` | Critical |
| 3 | No per-account lockout — an attacker can rotate IPs to bypass IP rate limiting and brute-force one email indefinitely | Important |
| 4 | `REDIS_URL` has no startup validation — a missing var silently uses `redis://localhost:6379` | Important |
| 5 | `trust proxy` not configured — with a load balancer in front, `req.ip` resolves to the proxy IP and all users share one rate-limit bucket | Important |
| 6 | IP is read from `req.ip` only — with Cloudflare in front `cf-connecting-ip` is more reliable | Important |
| 7 | `secondaryStorage.set` stores keys without a TTL when Better Auth passes `ttl = 0` — keys accumulate forever | Suggestion |
| 8 | `TOO_MANY_MESSAGE` hardcodes "1 hour" — will drift if `WINDOW_SECONDS` changes | Suggestion |
| 9 | `secondaryStorage.delete` uses `.then(() => undefined)` instead of `async/await` | Suggestion |

---

## 3. Acceptance Criteria

### AC-1 — Atomic Redis counter

**Given** a sign-in or sign-up request arrives  
**When** the rate-limit counter is incremented  
**Then** the increment and TTL are set atomically via Lua script — a process crash at any point leaves no immortal key

### AC-2 — Single shared Redis connection

**Given** the app starts  
**When** `IdentityModule` initialises  
**Then** both rate-limit middlewares receive the `REDIS_CLIENT` from `RedisModule` via DI — no `new Redis(...)` fallback executes, and only one extra Redis connection exists (excluding the module-level one in `auth.ts` which must remain independent because it initialises before the NestJS container)

### AC-3 — REDIS_URL validated at startup

**Given** `REDIS_URL` is absent from the environment  
**When** the app starts  
**Then** it throws before the NestJS container initialises, with a clear error message

### AC-4 — Trust proxy configured for qa/prod

**Given** `NODE_ENV === 'production'` or `NODE_ENV === 'qa'`  
**When** the NestJS app bootstraps  
**Then** Express `trust proxy` is set to `1`, so `req.ip` reflects the real client IP behind one proxy hop

**Given** `NODE_ENV === 'development'`  
**When** the NestJS app bootstraps  
**Then** `trust proxy` remains `false` (default)

### AC-5 — Cloudflare IP resolution

**Given** a request arrives with a `cf-connecting-ip` header  
**When** either rate-limit middleware resolves the client IP  
**Then** it reads `cf-connecting-ip` first and falls back to `req.ip`

### AC-6 — Per-account lockout

**Given** a user submits N failed sign-in attempts for the same email  
**When** the Nth failure occurs  
**Then** subsequent sign-in attempts for that email return HTTP 429 until the lockout window expires — regardless of the originating IP

Default limits:
- **Threshold**: 10 consecutive failures
- **Lockout window**: 15 minutes (auto-unlock, no manual intervention required)
- **Counter reset**: on successful sign-in

### AC-7 — Bounded secondaryStorage TTL

**Given** Better Auth calls `secondaryStorage.set` with a falsy `ttl`  
**When** the key is stored in Redis  
**Then** a maximum TTL of 24 hours is applied so keys do not accumulate forever

### AC-8 — Style fixes

- `secondaryStorage.delete` uses `async/await`, not `.then()`
- `TOO_MANY_MESSAGE` derives its time unit from `WINDOW_SECONDS / 3600` so it cannot drift from the constant

---

## 4. Design

### 4.1 Atomic counter (fixes #1)

Replace the two-call pattern in both middlewares with a Lua script:

```typescript
const LUA_INCR_WITH_TTL = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return c
`;

const count = await redis.eval(LUA_INCR_WITH_TTL, 1, key, String(WINDOW_SECONDS)) as number;
```

### 4.2 Redis DI (fixes #2)

Import `RedisModule` in `IdentityModule` and inject `REDIS_CLIENT` into each middleware.
Remove the `@Optional()` decorator and the `new Redis(...)` fallback from both middlewares.

```typescript
// identity.module.ts
imports: [RedisModule, AuthModule.forRoot({ auth }), ...]

// signin-ip-rate-limit.middleware.ts
constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
```

### 4.3 Env validation (fixes #4)

Add to `apps/api/src/env.ts`:

```typescript
assertEnv('REDIS_URL');
```

### 4.4 Trust proxy (fixes #5)

Add to `bootstrap()` in `main.ts`, after `NestFactory.create`:

```typescript
const behindProxy = ['production', 'qa'].includes(process.env.NODE_ENV ?? '');
if (behindProxy) {
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
}
```

### 4.5 Cloudflare IP resolution (fixes #6)

A shared helper used by both middlewares:

```typescript
// apps/api/src/shared/utils/resolve-client-ip.ts
import type { IncomingMessage } from 'node:http';

export function resolveClientIp(req: IncomingMessage & { ip?: string }): string {
  const cfIp = (req.headers['cf-connecting-ip'] as string | undefined)?.trim();
  return cfIp ?? req.ip ?? '';
}
```

### 4.6 Per-account lockout (new — AC-6)

**Location**: `apps/api/src/modules/identity/infrastructure/security/account-lockout.service.ts`

**Redis keys**:
- `account_lockout_failures:{normalizedEmail}` — integer counter, TTL = lockout window
- `account_lockout_blocked:{normalizedEmail}` — existence flag, TTL = lockout window

**Interface**:
```typescript
export class AccountLockoutService {
  constructor(private readonly redis: Redis) {}

  async recordFailure(email: string): Promise<void>;
  async recordSuccess(email: string): Promise<void>;
  async isLocked(email: string): Promise<boolean>;
}
```

**Wire-up**: hooked into the Better Auth `after` middleware in `auth.ts` and a new `before` hook:

- `before` hook on `sign-in/email` path → call `isLocked` → if true, throw a domain error
- `after` hook → if the response indicates `INVALID_EMAIL_OR_PASSWORD` → call `recordFailure`
- `after` hook → if a session was created → call `recordSuccess`

The `AccountLockoutService` is a plain class (no NestJS decorators). It accepts a `Redis` instance in its constructor. It is instantiated once at module level inside `auth.ts` using the same `redis` client already declared there — keeping it consistent with the Better Auth lifecycle, which starts before the NestJS container.

**Constants** (in the service file):
```typescript
const MAX_FAILURES = 10;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes
```

**Per-account lockout uses a Lua script too** to keep failure recording atomic:

```typescript
const LUA_RECORD_FAILURE = `
  local f = redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  if tonumber(f) >= tonumber(ARGV[2]) then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[1])
  end
  return f
`;
```

---

## 5. Files Changed

| File | Change |
|------|--------|
| `apps/api/src/env.ts` | Add `assertEnv('REDIS_URL')` |
| `apps/api/src/main.ts` | Add `trust proxy` for qa/prod environments |
| `apps/api/src/modules/identity/identity.module.ts` | Import `RedisModule` |
| `apps/api/src/modules/identity/infrastructure/web/middlewares/signin-ip-rate-limit.middleware.ts` | Inject `REDIS_CLIENT`; Lua atomic counter; `cf-connecting-ip`; message derived from constant |
| `apps/api/src/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware.ts` | Same fixes as signin middleware |
| `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` | `secondaryStorage.set` default TTL; `delete` async/await; wire `AccountLockoutService` into hooks |
| `apps/api/src/modules/identity/infrastructure/security/account-lockout.service.ts` | **New** — `AccountLockoutService` |
| `apps/api/src/shared/utils/resolve-client-ip.ts` | **New** — `resolveClientIp` helper |

---

## 6. Testing Strategy

### Unit tests (new)

| Test file | What to cover |
|-----------|---------------|
| `test/modules/identity/infrastructure/security/account-lockout.service.spec.ts` | `recordFailure` increments counter; at threshold sets blocked key; `isLocked` returns `true` when blocked; `recordSuccess` deletes both keys; all ops use mocked Redis |
| `test/modules/identity/infrastructure/web/middlewares/signin-ip-rate-limit.middleware.spec.ts` | Under limit → calls `next()`; over limit → 429; `cf-connecting-ip` header takes priority; Lua script invoked with correct key and TTL args |
| `test/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware.spec.ts` | Same structure as signin |
| `test/shared/utils/resolve-client-ip.spec.ts` | Prefers `cf-connecting-ip`; falls back to `req.ip`; falls back to empty string |

### Integration tests (new)

- Sign-in endpoint: 10 failures on same email → 429 on 11th; successful sign-in resets counter.
- `secondaryStorage.set` with `ttl = 0` → Redis key has a TTL ≤ 86400.

---

## 7. Out of Scope

- Cloudflare WAF rule configuration
- Email notification on account lockout
- Admin unlock endpoint
- Per-account lockout for Google OAuth sign-in (separate sign-in path)
- Removing the `rate_limit` orphan DB table (separate migration PR)
- Existing Better Auth built-in `rateLimit` config (keep as-is — it is the last-resort backstop)

---

## 8. Boundaries

| Category | Rule |
|----------|------|
| **Always** | Atomic Redis operations — no multi-step key writes without Lua or pipeline |
| **Always** | Inject the shared `REDIS_CLIENT` — never create `new Redis(...)` inside a middleware or service |
| **Always** | Validate all required env vars in `env.ts` before the container starts |
| **Ask first** | Changing lockout thresholds or window — security policy decisions |
| **Ask first** | Any change to `auth.ts` hooks that alters the sign-in/sign-up observable flow |
| **Never** | Store user-identifiable data in Redis without a TTL |
| **Never** | Return internal error details (Redis errors, stack traces) in HTTP 429 responses |
| **Never** | Touch the Better Auth built-in `rateLimit` config |
