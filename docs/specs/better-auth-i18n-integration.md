# Spec: Better Auth Multilanguage Integration

**Status:** Draft
**Author:** Claude (spec-driven-development)
**Date:** 2026-04-08
**Module:** `apps/api` — identity module (`modules/identity/infrastructure/better-auth/`)

---

## 1. Objective

Integrate better-auth's official `i18n` plugin so that **all error responses produced by better-auth endpoints** (`/api/v1/auth/*`) are returned in the caller's locale, using the same `Accept-Language` header convention already established for domain exceptions.

The integration must:

- Install and configure the `@better-auth/i18n` plugin inside the existing `auth.ts` configuration.
- Provide `es` (Spanish) translations for **every** better-auth error code reachable by the current plugin set (core + JWT + 2FA).
- Detect locale via `Accept-Language` header (primary strategy), matching the existing `parseLocale()` behavior.
- Preserve the current domain exception i18n architecture unchanged — better-auth's i18n plugin handles its own error responses; domain exceptions continue to flow through `DomainExceptionFilter`.
- Be extensible: adding a new locale requires only a new translation object — no code changes.

### Target users

- **Client apps** (`apps/client`, `apps/admin`) — receive localized auth error messages from better-auth endpoints (sign-in, sign-up, OAuth, password reset, 2FA, etc.).
- **API consumers** — any HTTP client hitting `/api/v1/auth/*` with an `Accept-Language` header.

### Non-goals

- Translating success messages (better-auth does not localize success responses).
- Translating domain-layer exceptions (already handled by `DomainExceptionFilter` + `identityDomainMessages`).
- Adding new locales beyond `en`/`es` (future work; architecture must support it).
- Client-side i18n (out of scope — this spec covers API responses only).

---

## 2. Architecture

### Current error flow (domain exceptions)

```
Domain layer throws DomainException(code)
  → Use case returns Result<T, DomainException>
    → Controller throws DomainException
      → DomainExceptionFilter catches
        → parseLocale(Accept-Language)
        → resolveMessage(domainMessages, code, locale)
        → ApiResponse<null> { error: code, message: localized }
```

### Current error flow (better-auth endpoints)

```
Client → POST /api/v1/auth/sign-in/email
  → better-auth processes request
    → On error: returns JSON { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }
    → Always English, no locale awareness
```

### Proposed error flow (better-auth with i18n plugin)

```
Client → POST /api/v1/auth/sign-in/email (Accept-Language: es)
  → better-auth processes request
    → i18n plugin detects locale from Accept-Language header
    → On error: returns JSON {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Correo electr&oacute;nico o contrase&ntilde;a inv&aacute;lidos",
        originalMessage: "Invalid email or password"
      }
```

### Two parallel i18n systems (by design)

| Concern | System | Catalog location | Resolution point |
|---------|--------|-----------------|-----------------|
| Better-auth endpoint errors | `@better-auth/i18n` plugin | `better-auth/i18n/translations.ts` | Inside better-auth (before response) |
| Domain exceptions (use cases) | `DomainExceptionFilter` | `modules/*/infrastructure/i18n/messages.ts` | NestJS exception filter layer |
| HTTP-level errors (guards, pipes) | `HttpExceptionFilter` | `shared/domain-utils.ts` (`httpMessages`) | NestJS exception filter layer |

These systems are intentionally separate:
- Better-auth owns its own request/response lifecycle (standalone pool, runs before NestJS DI).
- Domain exceptions are thrown by application-layer use cases within NestJS.
- Merging them would couple the domain layer to better-auth's error taxonomy.

### File structure (new/modified files)

```
apps/api/src/modules/identity/infrastructure/better-auth/
  auth.ts                          # MODIFIED — add i18n plugin
  i18n/
    translations.ts                # NEW — translation catalog (es)
    index.ts                       # NEW — re-export for clean imports
```

---

## 3. Better-Auth Error Code Catalog

### 3.1 Core error codes (BASE_ERROR_CODES)

These are thrown by better-auth's core auth routes (sign-in, sign-up, session, account linking, email verification, password reset):

| Code | Default message | HTTP status | Relevant endpoints |
|------|----------------|-------------|-------------------|
| `INVALID_EMAIL_OR_PASSWORD` | Invalid email or password | 401 | sign-in |
| `INVALID_EMAIL` | Invalid email | 400 | sign-in, sign-up |
| `INVALID_PASSWORD` | Invalid password | 400 | sign-up, change-password |
| `PASSWORD_TOO_SHORT` | Password too short | 400 | sign-up, change-password |
| `PASSWORD_TOO_LONG` | Password too long | 400 | sign-up, change-password |
| `PASSWORD_ALREADY_SET` | Password already set | 400 | set-password |
| `USER_NOT_FOUND` | User not found | 404 | various |
| `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` | User already exists | 400 | sign-up |
| `USER_EMAIL_NOT_FOUND` | User email not found | 401 | OAuth |
| `CREDENTIAL_ACCOUNT_NOT_FOUND` | Credential account not found | 404 | sign-in, change-password |
| `ACCOUNT_NOT_FOUND` | Account not found | 404 | account linking |
| `EMAIL_NOT_VERIFIED` | Email not verified | 403 | sign-in |
| `EMAIL_ALREADY_VERIFIED` | Email already verified | 400 | verify-email |
| `EMAIL_CAN_NOT_BE_UPDATED` | Email cannot be updated | 400 | update-user |
| `EMAIL_MISMATCH` | Email mismatch | 400 | account linking |
| `VERIFICATION_EMAIL_NOT_ENABLED` | Verification email not enabled | 400 | send-verification |
| `SESSION_EXPIRED` | Session expired | 401 | session |
| `SESSION_NOT_FRESH` | Session not fresh | 403 | sensitive ops |
| `FAILED_TO_CREATE_SESSION` | Failed to create session | 500 | sign-in, OAuth |
| `FAILED_TO_CREATE_USER` | Failed to create user | 500 | sign-up |
| `FAILED_TO_GET_SESSION` | Failed to get session | 500 | session |
| `FAILED_TO_GET_USER_INFO` | Failed to get user info | 401 | OAuth |
| `FAILED_TO_UPDATE_USER` | Failed to update user | 500 | update-user |
| `FAILED_TO_UNLINK_LAST_ACCOUNT` | Failed to unlink last account | 400 | account linking |
| `INVALID_TOKEN` | Invalid token | 401 | verify-email, reset-password |
| `TOKEN_EXPIRED` | Token expired | 401 | verify-email, reset-password |
| `PROVIDER_NOT_FOUND` | Provider not found | 404 | OAuth |
| `ID_TOKEN_NOT_SUPPORTED` | ID token not supported | 404 | OAuth |
| `INVALID_CALLBACK_URL` | Invalid callback URL | 400 | OAuth |
| `INVALID_REDIRECT_URL` | Invalid redirect URL | 400 | OAuth |
| `INVALID_ERROR_CALLBACK_URL` | Invalid error callback URL | 400 | OAuth |
| `INVALID_NEW_USER_CALLBACK_URL` | Invalid new user callback URL | 400 | OAuth |
| `INVALID_ORIGIN` | Invalid origin | 403 | CSRF |
| `MISSING_OR_NULL_ORIGIN` | Missing or null origin | 403 | CSRF |
| `CALLBACK_URL_REQUIRED` | Callback URL required | 400 | OAuth |
| `MISSING_FIELD` | Missing field | 400 | various |
| `FIELD_NOT_ALLOWED` | Field not allowed | 400 | various |
| `BODY_MUST_BE_AN_OBJECT` | Body must be an object | 400 | various |
| `VALIDATION_ERROR` | Validation error | 400 | various |
| `METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED` | Method not allowed | 405 | session |
| `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED` | Cross-site login blocked | 403 | CSRF |
| `ASYNC_VALIDATION_NOT_SUPPORTED` | Async validation not supported | 400 | internal |

### 3.2 Two-Factor (2FA) plugin error codes

| Code | Default message | HTTP status |
|------|----------------|-------------|
| `OTP_NOT_ENABLED` | OTP not enabled | 400 |
| `OTP_HAS_EXPIRED` | OTP has expired | 400 |
| `TOTP_NOT_ENABLED` | TOTP not enabled | 400 |
| `TWO_FACTOR_NOT_ENABLED` | Two factor isn't enabled | 400 |
| `BACKUP_CODES_NOT_ENABLED` | Backup codes aren't enabled | 400 |
| `INVALID_BACKUP_CODE` | Invalid backup code | 401 |
| `INVALID_CODE` | Invalid code | 401 |
| `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE` | Too many attempts. Please request a new code. | 429 |
| `INVALID_TWO_FACTOR_COOKIE` | Invalid two factor cookie | 401 |

### 3.3 Prioritized translation set

Not all error codes need human-friendly translations. Some are internal/developer-facing (e.g., `BODY_MUST_BE_AN_OBJECT`, `ASYNC_VALIDATION_NOT_SUPPORTED`). The translation catalog should prioritize **user-facing** errors:

**Must translate (user-facing):**
- `INVALID_EMAIL_OR_PASSWORD`, `INVALID_EMAIL`, `INVALID_PASSWORD`
- `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`
- `USER_NOT_FOUND`, `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`
- `CREDENTIAL_ACCOUNT_NOT_FOUND`
- `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_VERIFIED`
- `SESSION_EXPIRED`, `SESSION_NOT_FRESH`
- `INVALID_TOKEN`, `TOKEN_EXPIRED`
- All 2FA codes (`OTP_NOT_ENABLED`, `OTP_HAS_EXPIRED`, `TOTP_NOT_ENABLED`, `TWO_FACTOR_NOT_ENABLED`, `BACKUP_CODES_NOT_ENABLED`, `INVALID_BACKUP_CODE`, `INVALID_CODE`, `TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE`, `INVALID_TWO_FACTOR_COOKIE`)

**Should translate (sometimes user-visible):**
- `PASSWORD_ALREADY_SET`, `EMAIL_CAN_NOT_BE_UPDATED`, `EMAIL_MISMATCH`
- `FAILED_TO_UNLINK_LAST_ACCOUNT`
- `INVALID_ORIGIN`, `CROSS_SITE_NAVIGATION_LOGIN_BLOCKED`

**Can skip (developer/internal):**
- `BODY_MUST_BE_AN_OBJECT`, `MISSING_FIELD`, `FIELD_NOT_ALLOWED`, `VALIDATION_ERROR`
- `METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED`, `ASYNC_VALIDATION_NOT_SUPPORTED`
- `CALLBACK_URL_REQUIRED`, `INVALID_CALLBACK_URL`, `INVALID_REDIRECT_URL`, `INVALID_ERROR_CALLBACK_URL`, `INVALID_NEW_USER_CALLBACK_URL`
- `FAILED_TO_CREATE_SESSION`, `FAILED_TO_CREATE_USER`, `FAILED_TO_GET_SESSION`, `FAILED_TO_GET_USER_INFO`, `FAILED_TO_UPDATE_USER` (server errors — should show generic message)
- `PROVIDER_NOT_FOUND`, `ID_TOKEN_NOT_SUPPORTED` (OAuth misconfig)

---

## 4. Implementation

### 4.1 Install dependency

```bash
npm -C apps/api install @better-auth/i18n
```

### 4.2 Translation catalog

Create `apps/api/src/modules/identity/infrastructure/better-auth/i18n/translations.ts`:

```typescript
/**
 * Spanish translations for better-auth error codes.
 *
 * English is the built-in default — only non-English locales need entries here.
 * Keys must match better-auth's BASE_ERROR_CODES and plugin error code constants.
 */
export const esBetterAuthTranslations: Record<string, string> = {
  // ── Authentication ──────────────────────────────────────────────
  INVALID_EMAIL_OR_PASSWORD: 'Correo electr\u00f3nico o contrase\u00f1a inv\u00e1lidos.',
  INVALID_EMAIL: 'Correo electr\u00f3nico inv\u00e1lido.',
  INVALID_PASSWORD: 'Contrase\u00f1a inv\u00e1lida.',
  PASSWORD_TOO_SHORT: 'La contrase\u00f1a es demasiado corta.',
  PASSWORD_TOO_LONG: 'La contrase\u00f1a es demasiado larga.',
  PASSWORD_ALREADY_SET: 'La contrase\u00f1a ya est\u00e1 configurada.',
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    'No se encontr\u00f3 una cuenta con credenciales.',

  // ── Users ───────────────────────────────────────────────────────
  USER_NOT_FOUND: 'Usuario no encontrado.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'El usuario ya existe. Usa otro correo electr\u00f3nico.',
  USER_EMAIL_NOT_FOUND:
    'No se encontr\u00f3 un correo electr\u00f3nico para este usuario.',

  // ── Email verification ──────────────────────────────────────────
  EMAIL_NOT_VERIFIED: 'El correo electr\u00f3nico no ha sido verificado.',
  EMAIL_ALREADY_VERIFIED: 'El correo electr\u00f3nico ya est\u00e1 verificado.',
  EMAIL_CAN_NOT_BE_UPDATED:
    'El correo electr\u00f3nico no puede ser actualizado.',
  EMAIL_MISMATCH: 'El correo electr\u00f3nico no coincide.',
  VERIFICATION_EMAIL_NOT_ENABLED:
    'El env\u00edo de correos de verificaci\u00f3n no est\u00e1 habilitado.',

  // ── Sessions & tokens ──────────────────────────────────────────
  SESSION_EXPIRED: 'La sesi\u00f3n ha expirado.',
  SESSION_NOT_FRESH:
    'La sesi\u00f3n no es reciente. Por favor, vuelve a iniciar sesi\u00f3n.',
  INVALID_TOKEN: 'Token inv\u00e1lido.',
  TOKEN_EXPIRED: 'El token ha expirado.',

  // ── Account linking ─────────────────────────────────────────────
  ACCOUNT_NOT_FOUND: 'Cuenta no encontrada.',
  FAILED_TO_UNLINK_LAST_ACCOUNT:
    'No se puede desvincular la \u00faltima cuenta.',

  // ── Origin / CSRF ──────────────────────────────────────────────
  INVALID_ORIGIN: 'Origen no v\u00e1lido.',
  CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
    'Inicio de sesi\u00f3n bloqueado por navegaci\u00f3n entre sitios.',

  // ── Two-Factor Authentication ──────────────────────────────────
  OTP_NOT_ENABLED: 'OTP no est\u00e1 habilitado.',
  OTP_HAS_EXPIRED: 'El c\u00f3digo OTP ha expirado.',
  TOTP_NOT_ENABLED: 'TOTP no est\u00e1 habilitado.',
  TWO_FACTOR_NOT_ENABLED:
    'La autenticaci\u00f3n de dos factores no est\u00e1 habilitada.',
  BACKUP_CODES_NOT_ENABLED:
    'Los c\u00f3digos de respaldo no est\u00e1n habilitados.',
  INVALID_BACKUP_CODE: 'C\u00f3digo de respaldo inv\u00e1lido.',
  INVALID_CODE: 'C\u00f3digo inv\u00e1lido.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
    'Demasiados intentos. Por favor, solicita un nuevo c\u00f3digo.',
  INVALID_TWO_FACTOR_COOKIE:
    'Cookie de autenticaci\u00f3n de dos factores inv\u00e1lida.',

  // ── Server errors (generic) ────────────────────────────────────
  FAILED_TO_CREATE_SESSION: 'Ocurri\u00f3 un error inesperado.',
  FAILED_TO_CREATE_USER: 'Ocurri\u00f3 un error inesperado.',
  FAILED_TO_GET_SESSION: 'Ocurri\u00f3 un error inesperado.',
  FAILED_TO_GET_USER_INFO: 'Ocurri\u00f3 un error inesperado.',
  FAILED_TO_UPDATE_USER: 'Ocurri\u00f3 un error inesperado.',
};
```

### 4.3 Plugin wiring

Modify `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`:

```typescript
import { i18n } from '@better-auth/i18n';
import { esBetterAuthTranslations } from './i18n/translations';

export const auth = betterAuth({
  // ... existing config ...

  plugins: [
    // ... existing plugins (jwt, twoFactor) ...
    i18n({
      defaultLocale: 'en',
      detection: ['header'],    // Use Accept-Language header (matches parseLocale behavior)
      translations: {
        es: esBetterAuthTranslations,
      },
    }),
  ],
});
```

### 4.4 Adding a new locale (future)

To add e.g. Portuguese (`pt`):

1. Create a new translation object in `translations.ts` (or a separate file):
   ```typescript
   export const ptBetterAuthTranslations: Record<string, string> = { ... };
   ```
2. Add it to the `i18n()` plugin config:
   ```typescript
   translations: {
     es: esBetterAuthTranslations,
     pt: ptBetterAuthTranslations,
   }
   ```
3. Add `'pt'` to `SupportedLocale` in `shared/domain-utils.ts` (for domain exception parity).
4. Add `pt` entries to all `identityDomainMessages` catalogs.

---

## 5. Alignment with Domain Exception System

### Locale detection consistency

| System | Detection method | Fallback |
|--------|-----------------|----------|
| Domain exceptions (`DomainExceptionFilter`) | `parseLocale(req.headers['accept-language'])` | `'en'` |
| Better-auth i18n plugin | `Accept-Language` header (built-in parser) | `'en'` (via `defaultLocale`) |

Both systems use the same header and the same default. The behavior is consistent for any client that sends `Accept-Language`.

### Error code namespacing

| System | Code format | Examples |
|--------|------------|---------|
| Domain exceptions | `<MODULE>_<SCREAMING_SNAKE>` | `IDENTITY_INVALID_CREDENTIALS`, `REGION_COUNTRY_NOT_FOUND` |
| Better-auth errors | `<SCREAMING_SNAKE>` (no module prefix) | `INVALID_EMAIL_OR_PASSWORD`, `SESSION_EXPIRED` |

There is no collision between namespaces. Domain codes are always prefixed with the module name (`IDENTITY_`, `REGION_`). Better-auth codes have no prefix.

### Response format

Both systems return the same `ApiResponse<null>` envelope shape... with one difference:

**Domain exception response** (from `DomainExceptionFilter`):
```json
{
  "code": 401,
  "data": null,
  "error": "IDENTITY_INVALID_CREDENTIALS",
  "message": "La contrase\u00f1a actual es incorrecta.",
  "success": false
}
```

**Better-auth response** (from `@better-auth/i18n`):
```json
{
  "code": "INVALID_EMAIL_OR_PASSWORD",
  "message": "Correo electr\u00f3nico o contrase\u00f1a inv\u00e1lidos.",
  "originalMessage": "Invalid email or password"
}
```

Better-auth's response format is different — it uses its own envelope, not `ApiResponse<T>`. This is expected because better-auth handles its own request/response lifecycle outside NestJS. Client apps must handle both formats. This is already the case today (better-auth responses are not wrapped by `ApiResponseInterceptor`).

### When each system is used

| Endpoint pattern | Error system | Example |
|-----------------|-------------|---------|
| `/api/v1/auth/*` (better-auth routes) | `@better-auth/i18n` plugin | sign-in, sign-up, OAuth, 2FA verify |
| `/api/v1/*` (NestJS controllers) | `DomainExceptionFilter` + `HttpExceptionFilter` | change-password, profile update |

---

## 6. Testing Strategy

### 6.1 Unit tests

**Translation catalog completeness** (`better-auth/i18n/translations.spec.ts`):
- Every key in the "must translate" set has an `es` translation.
- No empty string values.
- No untranslated English values accidentally copied as Spanish.

### 6.2 Integration tests

**i18n plugin behavior** (test against real better-auth instance):

| Test case | Input | Expected |
|-----------|-------|----------|
| Sign-in with wrong password, `Accept-Language: es` | `POST /api/v1/auth/sign-in/email` | `message` contains Spanish text |
| Sign-in with wrong password, `Accept-Language: en` | `POST /api/v1/auth/sign-in/email` | `message` contains English text |
| Sign-in with wrong password, no `Accept-Language` | `POST /api/v1/auth/sign-in/email` | `message` contains English text (default) |
| Sign-in with wrong password, `Accept-Language: fr` | `POST /api/v1/auth/sign-in/email` | `message` contains English text (unsupported falls back) |
| Sign-up with existing email, `Accept-Language: es` | `POST /api/v1/auth/sign-up/email` | Spanish "user already exists" message |
| 2FA invalid code, `Accept-Language: es` | `POST /api/v1/auth/two-factor/verify-totp` | Spanish "invalid code" message |
| Verify email with expired token, `Accept-Language: es` | `GET /api/v1/auth/verify-email` | Spanish "token expired" message |
| `originalMessage` field present | Any error with `Accept-Language: es` | Response includes `originalMessage` with English text |

### 6.3 Non-regression

- Existing domain exception tests must continue to pass unchanged.
- Better-auth endpoints with `Accept-Language: en` (or missing) must return the same messages as before.

---

## 7. Acceptance Criteria

1. **AC-1:** `npm -C apps/api install @better-auth/i18n` succeeds and the package is in `package.json`.
2. **AC-2:** `POST /api/v1/auth/sign-in/email` with wrong credentials and `Accept-Language: es` returns a Spanish error message in the `message` field.
3. **AC-3:** The `originalMessage` field in better-auth error responses contains the English default.
4. **AC-4:** All "must translate" error codes (section 3.3) have `es` translations.
5. **AC-5:** 2FA error codes (`INVALID_CODE`, `OTP_HAS_EXPIRED`, etc.) return Spanish messages when `Accept-Language: es`.
6. **AC-6:** Unsupported locales (e.g., `Accept-Language: fr`) fall back to English.
7. **AC-7:** Domain exception responses (`IDENTITY_*` codes) are unaffected — same behavior as before.
8. **AC-8:** `npx turbo typecheck --filter @repo/api` passes.
9. **AC-9:** `npx turbo lint --filter @repo/api` passes.
10. **AC-10:** Translation catalog unit test verifies completeness (no missing keys).

---

## 8. Boundaries

### Always do
- Use `Accept-Language` header as the locale source (consistent with existing system).
- Translate all user-facing error codes to Spanish.
- Keep better-auth i18n and domain exception i18n as separate, parallel systems.
- Map server-error codes (`FAILED_TO_*`) to a generic "unexpected error" message in Spanish (never leak internals).

### Ask first
- Adding locales beyond `en`/`es`.
- Changing better-auth's response envelope format to match `ApiResponse<T>`.
- Adding cookie-based or session-based locale detection.

### Never do
- Merge better-auth error codes into the domain exception catalog (`identityDomainMessages`).
- Modify the `DomainExceptionFilter` to handle better-auth errors.
- Store translations in the database.
- Expose `originalMessage` in domain exception responses (those don't have it).

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `@better-auth/i18n` package version incompatibility | Plugin fails to load | Pin version matching `better-auth` core. Test on install. |
| Missing error codes in translation catalog | Some errors show English to Spanish-speaking users | Unit test that validates all "must translate" keys exist. |
| Better-auth adds new error codes in future versions | New errors untranslated | CI test that compares installed `BASE_ERROR_CODES` against catalog keys. Log warning for missing translations. |
| Two different response formats confuse client apps | Client parsing breaks | Document both formats. Client already handles both today. |
| Locale detection discrepancy between better-auth and `parseLocale()` | Same request gets different locale in different systems | Both use `Accept-Language` with `en` default. Test with edge cases (`es-419`, `es-MX`, quality values). |

---

## 10. Out of Scope (Future Work)

- **Client-side i18n**: Frontend apps have their own i18n system — this spec covers API responses only.
- **Additional locales**: Architecture supports it; adding `pt`, `fr`, etc. is a separate task.
- **Response envelope unification**: Making better-auth responses match `ApiResponse<T>` would require a response-transforming middleware — separate spec.
- **Dynamic translations from database**: Not needed; static catalogs are simpler and type-safe.
- **Translating success messages**: Better-auth doesn't localize success responses; not in scope.
