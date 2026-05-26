# Auth Module — Endpoints

All endpoints are mounted under `/api/v1/auth`. Better Auth handles the underlying request processing; the NestJS controller at `auth.http-handler.ts` wraps each call with i18n translation.

Session cookies use the prefix set in `COOKIE_PREFIX` (default `app`). The session cookie name is `<prefix>.session_token`.

---

## POST /sign-up/email

Register a new user with email and password.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name |
| `email` | string | Yes | Email address |
| `password` | string | Yes | Must pass the password policy (see `security.md`) |
| `captchaToken` | string | No | Required when `CAPTCHA_ENABLED=true` |

**Success — 200**

```json
{
  "user": { "id": "...", "name": "...", "email": "...", "emailVerified": false },
  "token": null
}
```

Email verification is sent automatically. The user cannot sign in until the email is verified.

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 422 | `USER_ALREADY_EXISTS` | Email is already registered |
| 422 | `PASSWORD_TOO_SHORT` | Password shorter than 8 characters |
| 422 | `PASSWORD_TOO_LONG` | Password longer than 128 characters |
| 403 | — | Captcha verification failed |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (5 requests/hour) |

---

## POST /sign-in/email

Authenticate with email and password.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Registered email address |
| `password` | string | Yes | Account password |

**Success — 200**

Sets a session cookie. Returns session and user in the body.

```json
{
  "session": { "id": "...", "expiresAt": "...", "userId": "..." },
  "user": { "id": "...", "name": "...", "email": "...", "emailVerified": true }
}
```

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 401 | `INVALID_EMAIL_OR_PASSWORD` | Wrong credentials |
| 401 | `EMAIL_NOT_VERIFIED` | Email not yet verified |
| 429 | `AUTH_ACCOUNT_LOCKED` | Too many failed attempts (brute force) |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (10 requests/15 min) |

---

## POST /sign-out

Invalidate the current session. Requires a valid session cookie.

**Request body** — none

**Success — 200**

```json
{ "success": true }
```

The session cookie is cleared and the Redis inactivity key is deleted.

---

## GET /session

Return the active session and user for the current session cookie.

**Request body** — none

**Success — 200 (authenticated)**

```json
{
  "session": { "id": "...", "expiresAt": "...", "userId": "..." },
  "user": { "id": "...", "name": "...", "email": "...", "emailVerified": true }
}
```

**Success — 200 (unauthenticated)**

```json
null
```

---

## POST /forget-password

Request a password-reset email. Always returns 200 regardless of whether the email is registered (prevents user enumeration).

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Email address to send the reset link to |
| `redirectTo` | string | No | URL to redirect to after the password is reset |

**Success — 200**

```json
{ "message": "Password reset email sent if the address exists" }
```

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (3 requests/hour) |

---

## POST /reset-password

Set a new password using the token from the reset email.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Token from the password-reset link |
| `newPassword` | string | Yes | New password, must pass the password policy |

**Success — 200**

```json
{ "message": "Password has been updated" }
```

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 400 | `INVALID_TOKEN` | Token is invalid or expired |
| 422 | `PASSWORD_TOO_SHORT` | New password shorter than 8 characters |
| 422 | `PASSWORD_TOO_LONG` | New password longer than 128 characters |

---

## POST /send-verification-email

Resend the email verification link for an unverified account.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Email address to resend the verification to |

**Success — 200**

```json
{ "message": "Verification email sent" }
```

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (3 requests/hour) |

---

## POST /verify-email

Verify an email address using the token from the verification link.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Token from the verification email link |

**Success — 200**

Returns a session (the user is automatically signed in after verification, per `autoSignInAfterVerification: true`).

```json
{
  "session": { "id": "...", "expiresAt": "...", "userId": "..." },
  "user": { "id": "...", "name": "...", "email": "...", "emailVerified": true }
}
```

After verification the browser is redirected to `{CLIENT_URL}/auth/email-verified`.

**Error codes**

| HTTP | Code | Reason |
|---|---|---|
| 400 | `INVALID_TOKEN` | Token is invalid or already used |
| 400 | `TOKEN_EXPIRED` | Verification link has expired |
