# Auth Module

## What this module does

The auth module provides complete authentication for the API. It handles email/password sign-up and sign-in, email verification, password reset, session management, brute-force protection, captcha verification, and password history enforcement. All auth logic is delegated to [Better Auth](https://better-auth.com/) and exposed via a NestJS catch-all controller.

## Quick start

1. Copy the required env vars from `setup.md` into your `.env` file.
2. Run the database migration to create the auth tables:
   ```sh
   npm -C apps/api run db:migrate
   ```
3. Start the API — the auth endpoints are available at `/api/v1/auth/*`.

## Key decisions

- Better Auth handles all session and token lifecycle; custom domain logic (brute force, password history, captcha) is injected via ports and hooks.
- All auth requests pass through `wrapForI18n`, which replaces Better Auth error messages with locale-aware strings before they reach the client.
- Sessions are single-session per user: creating a new session deletes all previous ones for that user.
- Session inactivity is tracked in Redis; the `SessionActivityMiddleware` expires sessions that exceed `SESSION_INACTIVITY_TIMEOUT_SECONDS` without activity.
- Passwords are hashed with Argon2id. The last `PASSWORD_HISTORY_DEPTH` hashes are stored and checked to prevent reuse.
- No PII is stored in the audit log; email and IP are SHA-256-hashed before insertion.
- Email provider is selected at startup via `EMAIL_PROVIDER`; SMTP and Postmark adapters share the same `EmailPort` contract.

## Sub-docs index

| File | Description |
|---|---|
| `architecture.md` | Hexagonal diagram, port/adapter table, request flows |
| `setup.md` | Prerequisites, env vars, local dev steps |
| `endpoints.md` | All auth HTTP endpoints with request/response shapes |
| `email.md` | EmailPort contract, SMTP and Postmark configuration |
| `security.md` | Password policy, Argon2id, brute force, captcha, sessions, audit log |
| `i18n.md` | Locale detection, supported locales, full error code catalog |
| `better-auth.md` | Better Auth config breakdown, hooks lifecycle, database hooks |
| `database.md` | All tables, indexes, migration commands, ownership |
