# Auth Module — Security

## Password policy

Enforced by `domain/policies/password.policy.ts` at the domain layer, before any persistence call.

| Rule | Value |
|---|---|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Must not have leading/trailing spaces | — |
| Must contain at least one uppercase letter | `[A-Z]` |
| Must contain at least one lowercase letter | `[a-z]` |
| Must contain at least one digit | `[0-9]` |
| Must contain at least one special character | any character outside `[A-Za-z0-9]` |

All violated rules are collected and thrown together as a `PasswordPolicyFailedException` so the client receives the full list of failures in a single response.

## Argon2id

All password hashing uses Argon2id via the `Argon2HashAdapter`. Parameters are configurable via env vars and default to values appropriate for a modern server.

| Parameter | Env var | Default |
|---|---|---|
| Algorithm | — | `argon2id` |
| Memory cost (KiB) | `ARGON2_MEMORY_COST` | `65536` (64 MiB) |
| Time cost (iterations) | `ARGON2_TIME_COST` | `3` |
| Parallelism | `ARGON2_PARALLELISM` | `4` |

The same options object (`ARGON2_OPTIONS` from `argon2.config.ts`) is used for both hashing at sign-up/password-change and verifying at sign-in.

## Brute force protection

Implemented by `RedisBruteForceAdapter`, which tracks failed sign-in attempts per email address in Redis.

- Key format: `bf:<email>` (email is lowercased and trimmed)
- The counter is incremented in the `before` hook on every sign-in request, regardless of outcome.
- If the counter exceeds `BRUTE_FORCE_MAX_ATTEMPTS`, Better Auth returns `AUTH_ACCOUNT_LOCKED` before credentials are checked.
- The TTL on the key is set to `BRUTE_FORCE_WINDOW_SECONDS` on the first increment.
- On a successful sign-in, the `after` hook calls `BruteForcePort.clear(email)` to reset the counter.

| Parameter | Env var | Default |
|---|---|---|
| Max attempts before lock | `BRUTE_FORCE_MAX_ATTEMPTS` | `5` |
| Window (seconds) | `BRUTE_FORCE_WINDOW_SECONDS` | `900` (15 min) |

## Captcha

Captcha verification is optional and is applied to the `POST /sign-up/email` endpoint only.

| Provider | Env var | Verification endpoint |
|---|---|---|
| Cloudflare Turnstile (default) | `CAPTCHA_PROVIDER=cloudflare` | `https://challenges.cloudflare.com/turnstile/v0/siteverify` |
| Google reCAPTCHA | `CAPTCHA_PROVIDER=google` | Google reCAPTCHA verify API |

When `CAPTCHA_ENABLED=false` (default), both adapters short-circuit and return `{ success: true }` without making any external call. When enabled, the client must include a `captchaToken` field in the sign-up body.

## Session management

| Property | Value |
|---|---|
| Session lifetime | 7 days (`expiresIn: 60*60*24*7`) |
| Session refresh threshold | Refreshed if older than 1 day (`updateAge: 60*60*24`) |
| Cookie cache max-age | 5 minutes (`cookieCache.maxAge: 60*5`) |
| Inactivity timeout | `SESSION_INACTIVITY_TIMEOUT_SECONDS` (default 1800 s / 30 min) |
| Single-session enforcement | Yes — creating a new session deletes all previous sessions for the same user |
| Secure cookies | Enabled in `production` (`NODE_ENV=production`) |

Inactivity tracking: when a session is created, `session:{id}:activity` is set in Redis with a TTL equal to `SESSION_INACTIVITY_TIMEOUT_SECONDS`. The `SessionActivityMiddleware` checks this key on every request carrying a session cookie. If the key is absent (expired), the cookie is cleared and a `401 AUTH_SESSION_EXPIRED` response is returned. On each active request the key TTL is renewed.

## Password history

The last `PASSWORD_HISTORY_DEPTH` hashed passwords are stored in the `password_history` table. `CheckPasswordHistoryUseCase` (input port `CheckPasswordHistoryPort`) iterates over them and calls `PasswordHasherPort.verify` for each. If any matches, a `PasswordReuseException` is thrown.

| Parameter | Env var | Default |
|---|---|---|
| History depth | `PASSWORD_HISTORY_DEPTH` | `5` |

## Audit log

The `AuditLogListener` listens on the wildcard event `auth.*` and writes every event to `auth_audit_log`.

**Privacy rule: no PII is stored.** Email and IP addresses are SHA-256-hashed before insertion. The raw values are never written to the database.

| Audit event | Triggered by |
|---|---|
| `auth.signed_up` | Successful sign-up (after hook) |
| `auth.signed_in` | Successful sign-in (after hook) |
| `auth.signed_out` | Successful sign-out (after hook) |

**Audit log fields**

| Field | Description |
|---|---|
| `event` | Event type string, e.g. `auth.signed_in` |
| `userId` | User ID from the Better Auth context |
| `emailHash` | `SHA-256(email.toLowerCase().trim())` — never plain text |
| `ipHash` | `SHA-256(ip)` — never plain text |
| `userAgent` | Raw user-agent string from the request |
| `sessionId` | Session ID from the Better Auth context |
| `correlationId` | Value of the `x-correlation-id` request header |
| `metadata` | Free-form JSONB for extra context |
| `createdAt` | Timestamp with timezone, defaults to `now()` |

The listener is fire-and-forget: it never re-throws. An audit log failure is logged as an error but does not interrupt the auth flow.
