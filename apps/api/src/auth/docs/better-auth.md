# Auth Module — Better Auth

## Why Better Auth

Better Auth was chosen because it provides a full session/token lifecycle, a Drizzle adapter for schema-native persistence, and a hook system that makes it straightforward to inject custom domain logic (brute force, captcha, password history) without forking the library. It also supports secondary storage (Redis) out of the box, which enables rate limiting and inactivity-based session expiry without additional middleware complexity.

## Config breakdown

The entire config lives in `BetterAuthService.createAuth()`.

| Key | Description |
|---|---|
| `baseURL` | Set to `API_BASE_URL`. Better Auth uses this to build absolute callback URLs. |
| `basePath` | `/api/v1/auth` — all BA routes are mounted under this prefix. |
| `secret` | `BETTER_AUTH_SECRET` — minimum 32 characters. Used to sign session tokens and cookies. |
| `database` | `drizzleAdapter(db, { provider: 'pg', schema: authSchema })` — points BA at the Drizzle Postgres client and the auth schema definitions. |
| `secondaryStorage` | Redis via `ioredis`. Used for rate limiting and as session cache. `get`, `set` (with optional TTL via `EXPIRE`), and `delete` are wired to the injected `Redis` client. |
| `session.expiresIn` | `604800` s (7 days). Absolute session lifetime. |
| `session.updateAge` | `86400` s (1 day). Session token is refreshed if the existing one is older than this. |
| `session.cookieCache` | Enabled, max-age 5 minutes. Reduces DB reads on high-frequency requests. |
| `emailAndPassword` | Enabled with `requireEmailVerification: true`. Min/max password lengths are 8/128. The `hash` and `verify` functions delegate to `Argon2HashAdapter`. |
| `emailAndPassword.sendResetPassword` | Calls `EmailPort.sendPasswordReset`. |
| `emailVerification.sendVerificationEmail` | Calls `EmailPort.sendVerification`. |
| `emailVerification.sendOnSignUp` | `true` — verification email is sent immediately after sign-up. |
| `emailVerification.autoSignInAfterVerification` | `true` — a session is created and returned after successful email verification. |
| `emailVerification.callbackURL` | `{CLIENT_URL}/auth/email-verified` — browser redirect target after verification. |
| `socialProviders.google` | Included only when `GOOGLE_ENABLED=true` and both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. |
| `rateLimit` | Stored in `secondaryStorage` (Redis). Custom rules per route (see table below). |
| `databaseHooks` | Custom logic injected at the database layer before/after row creation (see section below). |
| `hooks` | Global request middleware (before/after), used for captcha and brute-force (see section below). |
| `trustedOrigins` | `[CLIENT_URL]` — only this origin is trusted for CORS and CSRF. |
| `advanced.cookiePrefix` | Set to `COOKIE_PREFIX` (default `app`). Cookie name becomes `<prefix>.session_token`. |
| `advanced.useSecureCookies` | `true` when `NODE_ENV=production`. |

### Rate limit rules

| Route | Window | Max requests |
|---|---|---|
| `/sign-up/email` | 3600 s (1 hour) | `SIGNUP_RATE_LIMIT_MAX` (default 5) |
| `/sign-in/email` | 900 s (15 min) | `SIGNIN_RATE_LIMIT_MAX` (default 10) |
| `/forget-password` | 3600 s (1 hour) | `RESET_RATE_LIMIT_MAX` (default 3) |
| `/send-verification-email` | 3600 s (1 hour) | `3` (hardcoded) |

## Hooks lifecycle

Better Auth exposes two global middleware hooks (`before` and `after`) that run around every auth request. Both are created with `createAuthMiddleware` so they have access to the full request context.

### Before hook

Runs before Better Auth processes the request.

| Path matched | What it does |
|---|---|
| `/sign-up/email` | Extracts `captchaToken` from the body and calls `CaptchaPort.verify`. Throws `FORBIDDEN` if verification fails. Does nothing if `captchaToken` is absent (i.e., captcha is disabled). |
| `/sign-in/email` | Calls `BruteForcePort.increment(email)`. If the count exceeds `BRUTE_FORCE_MAX_ATTEMPTS`, throws `TOO_MANY_REQUESTS` with code `AUTH_ACCOUNT_LOCKED`. |
| All others | No-op. |

### After hook

Runs after Better Auth has processed the request and the response is being finalized.

| Path matched | What it does |
|---|---|
| `/sign-up/email` | Emits `auth.signed_up` event via `EventEmitter2` with `userId`, `email`, `ip`, `correlationId`. |
| `/sign-in/email` | Calls `BruteForcePort.clear(email)` to reset the failed-attempt counter, then emits `auth.signed_in`. |
| `/sign-out` | Deletes `session:{id}:activity` from Redis, then emits `auth.signed_out`. |
| All others | No-op. |

## databaseHooks explained

Database hooks run inside the database adapter layer, closer to the actual row operations than the request hooks.

### `session.create.before`

Enforces single-session-per-user. Before the new session row is inserted, all existing sessions for `sess.userId` that are not the current `sess.id` are deleted:

```ts
await db.delete(session).where(
  and(eq(session.userId, sess.userId), ne(session.id, sess.id))
);
```

### `session.create.after`

Seeds the Redis inactivity key for the new session:

```ts
await redis.set(
  `session:${sess.id}:activity`,
  Date.now().toString(),
  'EX',
  SESSION_INACTIVITY_TIMEOUT_SECONDS,
);
```

### `user.create.before`

Normalises the email to lowercase and trims whitespace before the `user` row is inserted, writing it to the `normalizedEmail` column (which has a unique index):

```ts
return { data: { ...u, normalizedEmail: u.email.toLowerCase().trim() } };
```

## Known limitations

- The `auth` property on `BetterAuthService` is typed as `any` because Better Auth's generic type does not unify with the base `BetterAuthOptions`-parameterised `Auth` type. This is a workaround for a Better Auth type inference limitation and is documented with eslint-disable comments.
- Better Auth does not expose a typed hook context, so all hook implementations cast `ctx` to `any` to access `ctx.path`, `ctx.body`, and `ctx.context`. These casts should be revisited if Better Auth adds typed context in a future release.
- The `plugins: []` array is intentionally empty. No Better Auth plugins are active; custom domain logic is injected via ports and hooks instead.
- Rate limiting is per-route and per-IP (managed by Better Auth via Redis). There is no per-user rate limiting beyond the brute-force counter.
