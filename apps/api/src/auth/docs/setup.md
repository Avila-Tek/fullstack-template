# Auth Module — Setup

## Prerequisites

- Node.js >= 20
- PostgreSQL (the API uses `drizzle-orm/node-postgres`)
- Redis (used for sessions, rate limiting, and brute-force counters)
- An SMTP server or a Postmark account for transactional email

## Environment variables

All variables are validated at startup via `envSchema` in `src/env.ts`. The process refuses to start if a required variable is absent or fails its Zod rule.

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `API_BASE_URL` | URL string | — | Yes | Full base URL of this API, e.g. `https://api.example.com` |
| `CLIENT_URL` | URL string | — | Yes | URL of the frontend client; used as trusted origin and email verification callback base |
| `BETTER_AUTH_SECRET` | string (min 32) | — | Yes | Secret used by Better Auth to sign tokens and cookies |
| `BETTER_AUTH_URL` | URL string | — | Yes | Should match `API_BASE_URL`; used internally by Better Auth |
| `COOKIE_PREFIX` | string | `app` | No | Prefix for all auth cookies, e.g. `app.session_token` |
| `DATABASE_URL` | string | — | Yes | PostgreSQL connection string |
| `REDIS_URL` | string | — | Yes | Redis connection string |
| `ARGON2_MEMORY_COST` | number | `65536` | No | Argon2id memory cost in KiB |
| `ARGON2_TIME_COST` | number | `3` | No | Argon2id time cost (iterations) |
| `ARGON2_PARALLELISM` | number | `4` | No | Argon2id parallelism factor |
| `PASSWORD_HISTORY_DEPTH` | number | `5` | No | Number of past password hashes to check for reuse |
| `PASSWORD_RESET_TOKEN_TTL_SECONDS` | number | `3600` | No | Lifetime of password reset tokens in seconds |
| `SESSION_INACTIVITY_TIMEOUT_SECONDS` | number | `1800` | No | Seconds of inactivity before a session is expired (30 min) |
| `SIGNUP_RATE_LIMIT_MAX` | number | `5` | No | Max sign-up requests per IP per hour |
| `SIGNIN_RATE_LIMIT_MAX` | number | `10` | No | Max sign-in requests per IP per 15 minutes |
| `RESET_RATE_LIMIT_MAX` | number | `3` | No | Max password-reset requests per IP per hour |
| `RATE_LIMIT_GLOBAL_MAX` | number | `100` | No | Global rate limit max requests per window |
| `RATE_LIMIT_GLOBAL_WINDOW_MS` | number | `60000` | No | Global rate limit window in milliseconds |
| `BRUTE_FORCE_MAX_ATTEMPTS` | number | `5` | No | Failed sign-in attempts before account lock |
| `BRUTE_FORCE_WINDOW_SECONDS` | number | `900` | No | Sliding window for brute-force counter in seconds (15 min) |
| `GOOGLE_ENABLED` | boolean | `false` | No | Enable Google OAuth provider |
| `GOOGLE_CLIENT_ID` | string | — | If `GOOGLE_ENABLED=true` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | string | — | If `GOOGLE_ENABLED=true` | Google OAuth client secret |
| `EMAIL_FROM` | email string | — | Yes | Sender address for all outgoing emails |
| `EMAIL_PROVIDER` | `smtp` \| `postmark` | `smtp` | No | Email delivery backend |
| `EMAIL_SMTP_HOST` | string | — | If `EMAIL_PROVIDER=smtp` | SMTP server hostname; omit to use the dev JSON-transport stub |
| `EMAIL_SMTP_PORT` | number | `587` | No | SMTP server port |
| `EMAIL_SMTP_USER` | string | — | No | SMTP authentication username |
| `EMAIL_SMTP_PASS` | string | — | No | SMTP authentication password |
| `POSTMARK_API_KEY` | string | — | If `EMAIL_PROVIDER=postmark` | Postmark server API key |
| `CAPTCHA_ENABLED` | boolean | `false` | No | Enable captcha verification on sign-up |
| `CAPTCHA_PROVIDER` | `cloudflare` \| `google` | `cloudflare` | No | Captcha backend |
| `CAPTCHA_SECRET_KEY` | string | — | If `CAPTCHA_ENABLED=true` | Secret key for the selected captcha provider |
| `OTP_TTL_SECONDS` | number | `300` | No | OTP validity window in seconds |
| `OTP_MAX_ATTEMPTS` | number | `5` | No | Max OTP verification attempts |

## Local dev steps

```sh
# 1. Install dependencies from repo root
npm install

# 2. Copy the example env file
cp apps/api/.env.example apps/api/.env
# Fill in DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, API_BASE_URL, CLIENT_URL, EMAIL_FROM

# 3. Generate and run auth migrations
npm -C apps/api run db:generate
npm -C apps/api run db:migrate

# 4. Start the API in watch mode (from repo root)
npx turbo dev --filter=@app/api

# 5. Verify auth endpoints are reachable
# GET http://localhost:3000/api/v1/health  → should return 200
```

When `EMAIL_SMTP_HOST` is not set, the SMTP adapter falls back to a `jsonTransport` stub that logs emails to the console instead of sending them — useful for local development without an SMTP server.
