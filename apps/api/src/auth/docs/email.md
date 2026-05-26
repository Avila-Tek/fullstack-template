# Auth Module — Email

## EmailPort contract

`EmailPort` is the abstract output port at `application/ports/out/email.port.ts`. Both adapters implement this interface.

```ts
abstract class EmailPort {
  abstract sendVerification(to: string, verificationUrl: string): Promise<void>;
  abstract sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  abstract send2faOtp(to: string, otp: string): Promise<void>;
  abstract sendLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendFailedLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendSessionRevoked(to: string): Promise<void>;
}
```

| Method | Trigger |
|---|---|
| `sendVerification` | Called by Better Auth after sign-up and on resend-verification requests |
| `sendPasswordReset` | Called by Better Auth when a forget-password request succeeds |
| `send2faOtp` | Reserved for future 2FA flow |
| `sendLoginAlert` | Reserved for security notification flow |
| `sendFailedLoginAlert` | Reserved for security notification flow |
| `sendSessionRevoked` | Reserved for session revocation notification |

If delivery fails, both adapters throw `EmailDeliveryFailedException` which maps to HTTP 502 via the domain exception filter.

## Provider selection

Set `EMAIL_PROVIDER` to choose which adapter is instantiated at startup. Only the selected adapter is created; the other is never initialised.

```
EMAIL_PROVIDER=smtp      → SmtpEmailAdapter    (default)
EMAIL_PROVIDER=postmark  → PostmarkEmailAdapter
```

## SMTP configuration

Used when `EMAIL_PROVIDER=smtp`.

| Variable | Default | Description |
|---|---|---|
| `EMAIL_FROM` | — (required) | Sender address for all outgoing mail |
| `EMAIL_SMTP_HOST` | — | SMTP server hostname. If omitted, the adapter uses a `jsonTransport` stub that prints emails to stdout instead of sending them. |
| `EMAIL_SMTP_PORT` | `587` | SMTP server port |
| `EMAIL_SMTP_USER` | — | SMTP authentication username |
| `EMAIL_SMTP_PASS` | — | SMTP authentication password |

The SMTP adapter is built on `nodemailer`. When `EMAIL_SMTP_HOST` is not set, the JSON-transport stub is used automatically — this is the intended local-dev behaviour.

## Postmark configuration

Used when `EMAIL_PROVIDER=postmark`.

| Variable | Default | Description |
|---|---|---|
| `EMAIL_FROM` | — (required) | Sender address; must be a verified Postmark sender signature |
| `POSTMARK_API_KEY` | — | Postmark Server API key |

The Postmark adapter uses `postmark.ServerClient.sendEmail` with plain-text bodies. Template support is not wired yet; the current implementation sends inline text for each message type.

## Postmark template catalog

The table below documents the intended template mapping for when HTML templates are added. The current adapters send plain-text inline bodies.

| Alias | Variables | Trigger |
|---|---|---|
| `auth-verify-email` | `verificationUrl` | Sign-up, resend-verification |
| `auth-password-reset` | `resetUrl` | Forget-password |
| `auth-2fa-otp` | `otp` | 2FA code delivery |
| `auth-login-alert` | `ip` | Successful login from new IP |
| `auth-failed-login` | `ip` | Failed login attempt |
| `auth-session-revoked` | — | Session invalidated by admin or policy |
