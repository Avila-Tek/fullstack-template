# Auth Module — Architecture

## Hexagonal diagram

```
                        ┌─────────────────────────────────────────────────────┐
                        │                   AuthModule                        │
                        │                                                     │
  HTTP Request          │  ┌─────────────────────────────────────────────┐   │
 ─────────────►  AuthHttpHandler (web/auth.http-handler.ts)              │   │
                        │  │           ▼                                  │   │
                        │  │   BetterAuthService  ◄── hooks ──┐          │   │
                        │  │           │                       │          │   │
                        │  └─────┬─────┘                       │          │   │
                        │        │                             │          │   │
                        │   ╔════╧══════════════════════════╗  │          │   │
                        │   ║      Application Ports        ║  │          │   │
                        │   ╟───────────────────────────────╢  │          │   │
                        │   ║  BruteForcePort               ║──┘          │   │
                        │   ║  CaptchaPort                  ║             │   │
                        │   ║  EmailPort                    ║             │   │
                        │   ║  PasswordHasherPort           ║             │   │
                        │   ║  SecurityNotificationPort     ║             │   │
                        │   ║  PasswordHistoryRepositoryPort║             │   │
                        │   ║  SessionRepositoryPort        ║             │   │
                        │   ║  CheckPasswordHistoryPort (in)║             │   │
                        │   ╚════╤══════════════════════════╝             │   │
                        │        │                                        │   │
                        │   ╔════╧══════════════════════════╗             │   │
                        │   ║      Infrastructure Adapters  ║             │   │
                        │   ╟───────────────────────────────╢             │   │
                        │   ║  RedisBruteForceAdapter       ║             │   │
                        │   ║  Cloudflare/GoogleCaptcha     ║             │   │
                        │   ║  Smtp/PostmarkEmailAdapter    ║             │   │
                        │   ║  Argon2HashAdapter            ║             │   │
                        │   ║  SecurityNotificationAdapter  ║             │   │
                        │   ║  DrizzlePasswordHistoryAdapter║             │   │
                        │   ║  DrizzleSessionRepositoryAdapter            │   │
                        │   ╚═══════════════════════════════╝             │   │
                        │                                                     │
                        │   EventEmitter2 ──► AuditLogListener               │
                        └─────────────────────────────────────────────────────┘
```

## Port → Adapter table

| Port (abstract class) | Adapter (implementation) | Selection logic |
|---|---|---|
| `BruteForcePort` | `RedisBruteForceAdapter` | Always |
| `CaptchaPort` | `CloudflareCaptchaAdapter` | `CAPTCHA_PROVIDER=cloudflare` (default) |
| `CaptchaPort` | `GoogleCaptchaAdapter` | `CAPTCHA_PROVIDER=google` |
| `EmailPort` | `SmtpEmailAdapter` | `EMAIL_PROVIDER=smtp` (default) |
| `EmailPort` | `PostmarkEmailAdapter` | `EMAIL_PROVIDER=postmark` |
| `PasswordHasherPort` | `Argon2HashAdapter` | Always |
| `SecurityNotificationPort` | `SecurityNotificationAdapter` | Always |
| `PasswordHistoryRepositoryPort` | `DrizzlePasswordHistoryAdapter` | Always |
| `SessionRepositoryPort` | `DrizzleSessionRepositoryAdapter` | Always |
| `CheckPasswordHistoryPort` (in) | `CheckPasswordHistoryUseCase` | Always |

## Module exports

| Export | Consumer |
|---|---|
| `BetterAuthService` | JwtAuthGuard (F3 — JWT/API-key module) |
| `SessionRepositoryPort` | GetTokenUseCase (F3) |

## Sign-up request flow

1. `POST /api/v1/auth/sign-up/email` hits `AuthHttpHandler.signUp`.
2. `wrapForI18n` patches `res.end` to translate error codes before they leave the process.
3. `toNodeHandler` delegates the request to Better Auth.
4. Better Auth runs the global `before` hook, which calls `createSignUpBeforeHook`.
5. `createSignUpBeforeHook` extracts `captchaToken` from the body and calls `CaptchaPort.verify`. If verification fails, an `FORBIDDEN` API error is thrown.
6. Better Auth validates the body, checks for duplicate email, and calls `PasswordHasherPort.hash` (Argon2id) to hash the password.
7. The `databaseHooks.user.create.before` hook normalises `normalizedEmail` before the row is inserted.
8. Better Auth inserts the `user` and `account` rows, then calls `EmailPort.sendVerification`.
9. Better Auth runs the global `after` hook, which calls `createSignUpAfterHook`.
10. `createSignUpAfterHook` emits `auth.signed_up` via `EventEmitter2`.
11. `AuditLogListener` catches `auth.*` and inserts a row into `auth_audit_log` (email and IP stored as SHA-256 hashes).
12. Response is returned to the client; the client must verify the email before signing in.

## Sign-in request flow

1. `POST /api/v1/auth/sign-in/email` hits `AuthHttpHandler.signIn`.
2. `wrapForI18n` patches `res.end`.
3. `toNodeHandler` delegates to Better Auth.
4. Better Auth runs the global `before` hook, which calls `createSignInBeforeHook`.
5. `createSignInBeforeHook` calls `BruteForcePort.increment(email)`. If the count exceeds `BRUTE_FORCE_MAX_ATTEMPTS`, a `TOO_MANY_REQUESTS` error is thrown with code `AUTH_ACCOUNT_LOCKED`.
6. Better Auth looks up the user, verifies the email is verified, then calls `PasswordHasherPort.verify` to check the password.
7. If credentials are valid, Better Auth creates a session. The `databaseHooks.session.create.before` hook deletes all other active sessions for the user (single-session enforcement).
8. The `databaseHooks.session.create.after` hook seeds `session:{id}:activity` in Redis with TTL = `SESSION_INACTIVITY_TIMEOUT_SECONDS`.
9. Better Auth runs the global `after` hook, which calls `createSignInAfterHook`.
10. `createSignInAfterHook` calls `BruteForcePort.clear(email)` to reset the failed-attempt counter, then emits `auth.signed_in`.
11. `AuditLogListener` writes the audit row.
12. A session cookie is set; the response returns the session and user.
