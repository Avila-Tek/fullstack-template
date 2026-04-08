# Plan: Auth Rate-Limiting Hardening

**Spec**: `docs/specs/SPEC-auth-hardening.md`  
**Branch**: `feat/auth-integration-template`  
**Scope**: `apps/api` — `IdentityModule`, `better-auth` infrastructure, shared utils  
**Status**: Ready for implementation

---

## Dependency Graph

```
T1 (env + trust proxy)         ──────────────────────────────────────────────────┐
T2 (resolveClientIp helper)    ──────────────────────────► T4 (middleware refactor)
T3 (secondaryStorage fixes)    ──────────────────────────────────────────────────┤
                                                                                  ▼
                                                                         CHECKPOINT 1
                                                                                  │
T4 (middleware hardening)      ──────── depends on T2 ────────────────────────── ┤
                                                                                  ▼
                                                                         CHECKPOINT 2
                                                                                  │
T5 (AccountLockoutService)     ──── independent (uses auth.ts redis client) ──── ┤
                                                                                  ▼
                                                                         CHECKPOINT 3
                                                                                  │
                                                                         FINAL VALIDATION
```

**Parallelizable within phases**:
- T1, T2, T3 have no interdependencies — can be implemented in any order
- T4 must follow T2 (imports `resolveClientIp`)
- T5 is independent but logically after T4 (touches same `auth.ts`)

---

## Phase 1 — Infrastructure plumbing (T1, T2, T3)

### Task 1 — Env validation + trust proxy

**Addresses**: Issue #4 (REDIS_URL validation), Issue #5 (trust proxy)  
**Files**:
- `apps/api/src/env.ts` — add one line
- `apps/api/src/main.ts` — add trust proxy block after `NestFactory.create`

**Acceptance criteria**:
- AC-3: `REDIS_URL` absent → app throws before NestJS container starts, with a clear message
- AC-4: `NODE_ENV === 'production'` or `'qa'` → `trust proxy = 1`; `development` → unchanged

**Implementation**:
```typescript
// env.ts — after existing assertEnv calls:
assertEnv('REDIS_URL');

// main.ts — after app.useLogger(...), before app.setGlobalPrefix(...):
const behindProxy = ['production', 'qa'].includes(process.env.NODE_ENV ?? '');
if (behindProxy) {
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
}
```

**Verification**: `npx turbo typecheck --filter @repo/api` passes; no `any` introduced.

---

### Task 2 — resolveClientIp shared helper + unit tests

**Addresses**: Issue #6 (Cloudflare IP resolution)  
**Files**:
- `apps/api/src/shared/utils/resolve-client-ip.ts` — **new**
- `apps/api/test/shared/utils/resolve-client-ip.spec.ts` — **new**

**Acceptance criteria** (AC-5):
- `cf-connecting-ip` header present → returns trimmed header value
- `cf-connecting-ip` absent or empty → falls back to `req.ip`
- Neither present → returns `''`

**Implementation**:
```typescript
import type { IncomingMessage } from 'node:http';

export function resolveClientIp(req: IncomingMessage & { ip?: string }): string {
  const cfIp = (req.headers['cf-connecting-ip'] as string | undefined)?.trim();
  return cfIp || req.ip || '';
}
```

**Test cases**:
1. `cf-connecting-ip` header present → returns CF value (not `req.ip`)
2. `cf-connecting-ip` absent, `req.ip` present → returns `req.ip`
3. Both absent → returns `''`
4. `cf-connecting-ip` is whitespace-only → falls back to `req.ip`

**Verification**: 4 unit tests pass (GREEN).

---

### Task 3 — secondaryStorage style fixes

**Addresses**: Issue #7 (unbounded TTL), Issue #9 (async style)  
**File**: `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

**Acceptance criteria** (AC-7, AC-8 style):
- `secondaryStorage.set` with falsy `ttl` applies a 24 h (86400 s) maximum TTL — keys cannot accumulate forever
- `secondaryStorage.delete` uses `async/await`, not `.then()`

**Implementation** — replace the `secondaryStorage` block:
```typescript
secondaryStorage: {
  get: (key) => redis.get(key),
  set: async (key, value, ttl) => {
    await redis.set(key, value, 'EX', ttl || 86400);
  },
  delete: async (key) => {
    await redis.del(key);
  },
},
```

**Verification**: `npx turbo typecheck --filter @repo/api` passes; existing auth tests still pass.

---

### CHECKPOINT 1

- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] `npm -C apps/api test` — all existing tests plus T2 unit tests pass
- [ ] No `any`, no `console.log` in T1–T3 files

---

## Phase 2 — Middleware hardening (T4, depends on T2)

### Task 4 — Atomic counter + DI injection + CF IP + derived message

**Addresses**: Issue #1 (atomic), Issue #2 (DI), Issue #6 (CF IP via `resolveClientIp`), Issue #8 (message drift)

**Files**:
- `apps/api/src/modules/identity/infrastructure/web/middlewares/signin-ip-rate-limit.middleware.ts`
- `apps/api/src/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware.ts`
- `apps/api/src/modules/identity/identity.module.ts`
- `apps/api/test/modules/identity/infrastructure/web/middlewares/signin-ip-rate-limit.middleware.spec.ts` — update
- `apps/api/test/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware.spec.ts` — **new**

**Acceptance criteria** (AC-1, AC-2, AC-5):
- `redis.eval` called with Lua script, key, and TTL — no separate `incr`/`expire`
- No `new Redis(...)` fallback anywhere in either middleware file
- `cf-connecting-ip` header takes priority over `req.ip` for key derivation
- `TOO_MANY_MESSAGE` computed from `WINDOW_SECONDS` at declaration time — cannot drift

**New `RedisLike` interface** (same in both files):
```typescript
interface RedisLike {
  eval(script: string, numkeys: number, key: string, ttl: string): Promise<unknown>;
}
```

**Lua script constant** (same in both files):
```typescript
const LUA_INCR_WITH_TTL = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return c
`;
```

**Message constant** (dynamic, cannot drift):
```typescript
const WINDOW_HOURS = Math.round(WINDOW_SECONDS / 3600);
const TOO_MANY_MESSAGE = `Too many sign-in attempts. Try again in ${WINDOW_HOURS} hour${WINDOW_HOURS === 1 ? '' : 's'}.`;
```

**Constructor change** (both middlewares — removes `@Optional()` and fallback):
```typescript
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.constants';

constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisLike) {}
```

**`use` method body** (both middlewares, key prefix differs):
```typescript
async use(req: RequestWithIp, res: ServerResponse, next: () => void): Promise<void> {
  const ip = resolveClientIp(req);
  const hash = createHash('sha256').update(ip).digest('hex');
  const key = `signin_ratelimit:${hash}`; // or signup_ratelimit

  const count = (await this.redis.eval(LUA_INCR_WITH_TTL, 1, key, String(WINDOW_SECONDS))) as number;

  if (count > RATE_LIMIT) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: TOO_MANY_MESSAGE }));
    return;
  }

  next();
}
```

**IdentityModule changes**:
```typescript
imports: [RedisModule, AuthModule.forRoot({ auth }), ...],
providers: [
  SigninIpRateLimitMiddleware,
  SignupIpRateLimitMiddleware,
  // ... existing providers
],
```

**Updated signin middleware test** — replace `incr`/`expire` mock:
```typescript
interface RedisLike {
  eval(script: string, numkeys: number, key: string, ttl: string): Promise<unknown>;
}

function makeRedis(count: number): RedisLike {
  return { eval: vi.fn().mockResolvedValue(count) };
}
```
New test assertions to add:
- `eval` called with Lua string containing `INCR` and `EXPIRE`
- `eval` called with `key` argument matching the CF IP when `cf-connecting-ip` header is set
- `eval` called with TTL argument `'3600'`
- Remove: "sets expiry only on first request" and "does not set expiry on subsequent requests" (Lua handles this)

**New signup middleware test** — mirrors signin spec structure with `signup_ratelimit:` key prefix and limit of 5.

**Verification**:
- `npx turbo typecheck --filter @repo/api` passes
- All signin + signup middleware tests pass
- No `@Optional()` in either middleware file (grep check)
- No `new Redis(...)` in either middleware file (grep check)

---

### CHECKPOINT 2

- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] All signin + signup middleware tests pass
- [ ] `grep -r '@Optional()' apps/api/src/modules/identity/infrastructure/web/middlewares/` → no matches
- [ ] `grep -r 'new Redis' apps/api/src/modules/identity/infrastructure/web/middlewares/` → no matches

---

## Phase 3 — Per-account lockout (T5)

### Task 5 — AccountLockoutService + auth.ts wiring

**Addresses**: Issue #3 (per-account lockout)

**Files**:
- `apps/api/src/modules/identity/infrastructure/security/account-lockout.service.ts` — **new**
- `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` — compose before/after hooks
- `apps/api/test/modules/identity/infrastructure/security/account-lockout.service.spec.ts` — **new**

**Note on sign-up hooks composition**: The current `before` hook is `signUpBeforeHook` (a `createAuthMiddleware` result). To add the lockout `isLocked` check we must compose them. The pattern in the codebase (see `sign-in.hooks.ts`) is to export a body function (`signInAfterMiddlewareBody`) and call it from the combined middleware. We need `sign-up.hooks.ts` to similarly export a body function, then compose in `auth.ts`. This is a prerequisite step for T5.5.

**Acceptance criteria** (AC-6):
- 10 consecutive failures for the same email → 11th attempt returns 429
- Successful sign-in resets the failure counter
- Lockout window is 15 minutes (900 s), auto-expires
- Failure recording + lockout-flag set are atomic (single Lua eval)

**Redis key scheme**:
- `account_lockout_failures:{normalizedEmail}` — integer counter, TTL = 900 s
- `account_lockout_blocked:{normalizedEmail}` — existence flag, TTL = 900 s

**Constants** (defined in service file):
```typescript
const MAX_FAILURES = 10;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 900
```

**Lua script for `recordFailure`**:
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

**Service interface**:
```typescript
export class AccountLockoutService {
  constructor(private readonly redis: Redis) {}
  async recordFailure(email: string): Promise<void>;
  async recordSuccess(email: string): Promise<void>;
  async isLocked(email: string): Promise<boolean>;
}
```

Use `normalizeEmail(email)` for all key derivation (same helper already used in `auth.ts`).

**auth.ts wiring** — sign-in failure detection uses the same context-inspection pattern already in `signInAfterMiddlewareBody`:
- Success: `(ctx.context.returned as Record<string,unknown>)?.user?.id` is a string
- Failure: `deriveErrorType(ctx.context.returned) === 'invalid_credentials'`

```typescript
// At module level in auth.ts, after the existing redis declaration:
const accountLockout = new AccountLockoutService(redis);

// hooks.before — compose signUpBeforeHook body + lockout isLocked check:
before: createAuthMiddleware(async (ctx) => {
  await signUpBeforeHookBody(ctx); // requires exporting body from sign-up.hooks.ts

  if (ctx.path === '/sign-in/email') {
    const email = (ctx.body as Record<string, unknown>)?.email;
    if (typeof email === 'string' && await accountLockout.isLocked(email)) {
      throw new APIError('TOO_MANY_REQUESTS', { message: 'Account temporarily locked.' });
    }
  }
}),

// hooks.after — existing + lockout outcome recording:
after: createAuthMiddleware(async (ctx) => {
  await signInAfterMiddlewareBody(ctx);
  await googleOAuthAfterMiddlewareBody(ctx);

  if (ctx.path === '/sign-in/email') {
    const email = (ctx.body as Record<string, unknown>)?.email;
    if (typeof email === 'string') {
      const returned = ctx.context.returned as Record<string, unknown> | undefined;
      const userId = (returned?.user as Record<string, unknown> | undefined)?.id;
      if (typeof userId === 'string') {
        await accountLockout.recordSuccess(email);
      } else if (deriveErrorType(returned) === 'invalid_credentials') {
        await accountLockout.recordFailure(email);
      }
    }
  }
}),
```

**Note**: `deriveErrorType` from `sign-in.hooks.ts` must be exported or the logic inlined. Prefer importing it.

**Test cases for AccountLockoutService** (all use mocked Redis `eval`/`del`/`exists`):
1. `recordFailure` below threshold → `eval` called with both keys and TTL/threshold args; no blocked key set
2. `recordFailure` at threshold (10th call) → blocked key is set in Lua
3. `isLocked` when `exists` returns 0 → returns `false`
4. `isLocked` when `exists` returns 1 → returns `true`
5. `recordSuccess` → `del` called with both keys
6. Email is normalized before key derivation

**Verification**:
- All AccountLockoutService tests pass
- `npx turbo typecheck --filter @repo/api` passes

---

### CHECKPOINT 3

- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] All AccountLockoutService tests pass
- [ ] `auth.ts` before hook composes sign-up check + lockout isLocked
- [ ] `auth.ts` after hook records failure / success on sign-in path

---

## Phase 4 — Final validation

- [ ] `npx turbo typecheck --filter @repo/api` — clean
- [ ] `npx turbo lint --filter @repo/api` — clean (run `lint:fix` if needed)
- [ ] `npm -C apps/api test` — all tests pass
- [ ] No `any`/`as any` in any changed file
- [ ] No `console.log` in any changed file
- [ ] No `new Redis(...)` inside either middleware file
- [ ] No `@Optional()` on middleware constructors

---

## Risks and Decisions

| # | Risk / Decision | Resolution |
|---|----------------|------------|
| R1 | `signUpBeforeHook` is a composed `createAuthMiddleware` result — cannot directly call it from a new composed middleware without refactoring | Export `signUpBeforeHookBody` from `sign-up.hooks.ts` (same pattern as `signInAfterMiddlewareBody` in sign-in.hooks.ts) |
| R2 | `deriveErrorType` is not exported from `sign-in.hooks.ts` | Export it; it's a pure function with no side effects |
| R3 | Existing signin middleware test mocks `incr`/`expire`; updating to `eval` is a breaking test change | Update test first (RED), then refactor implementation (GREEN) |
| R4 | NestJS middlewares with `@Inject` must be in `providers` array | Add both middlewares to `IdentityModule.providers` alongside `RedisModule` import |
| D1 | `AccountLockoutService` is a plain class (no `@Injectable`) instantiated at module level in `auth.ts` — consistent with how `redis` itself is set up (pre-container lifecycle) | Confirmed by spec §4.6 |
| D2 | `resolveClientIp` lives in `shared/utils/` — no framework coupling, matches existing `normalize-email` and `user-agent-parser` neighbours | Confirmed |
| D3 | `APIError` is from `better-auth/api` — used in `before` hook for 429 response on locked account | Import alongside `createAuthMiddleware` |

---

## Issues → Tasks Mapping

| Issue | Severity | Task(s) |
|-------|----------|---------|
| #1 — non-atomic incr + expire | Critical | T4 |
| #2 — double Redis connection / @Optional fallback | Critical | T4 |
| #3 — no per-account lockout | Important | T5 |
| #4 — REDIS_URL not validated at startup | Important | T1 |
| #5 — trust proxy not configured | Important | T1 |
| #6 — IP from req.ip only (no CF header) | Important | T2, T4 |
| #7 — secondaryStorage.set no default TTL | Suggestion | T3 |
| #8 — TOO_MANY_MESSAGE hardcodes "1 hour" | Suggestion | T4 |
| #9 — secondaryStorage.delete uses .then() | Suggestion | T3 |
