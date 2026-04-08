# Spec: Postmark Email Integration

**Status:** Draft
**Author:** Claude (spec-driven-development)
**Date:** 2026-04-08
**Module:** `apps/api` — shared email infrastructure + identity module wiring

---

## 1. Objective

Integrate [Postmark](https://postmarkapp.com) as the transactional and broadcast email provider for the API. The integration follows a **two-layer architecture** where shared infrastructure handles delivery and each module owns its own email content:

- **Shared layer** (`src/shared/email/`) — generic `EmailSenderPort` that any module can inject to send arbitrary emails via Postmark.
- **Module layer** (e.g. `src/modules/identity/infrastructure/email/`) — each module owns its domain-specific port, templates, and adapter that composes template rendering + shared sender.
- Wire into Better Auth's `sendResetPassword` and `sendVerificationEmail` callbacks (currently TODO stubs).
- Build HTML email bodies in the API (no server-side Postmark templates).
- Support both **transactional** and **broadcast/marketing** message streams.
- Optionally retry failed sends via BullMQ when queue infrastructure env vars are present; otherwise fire-and-forget with structured logging.

### Target users

- **Identity module** — verification, password reset, email change, login alerts (owns its templates and `EmailServicePort`).
- **Future modules** — any module that needs to send email imports the shared `EmailSenderPort` and owns its own templates.

---

## 2. Architecture

### High-level flow (two-layer architecture)

```
                         IDENTITY MODULE                              SHARED LAYER
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌────────────────┐
│  Use Case /  │───▶│  EmailServicePort │───▶│  IdentityEmail      │───▶│  EmailSender   │
│  Auth Hook   │    │  (identity-owned) │    │  Adapter            │    │  Port (shared) │
└─────────────┘    └──────────────────┘    │  • renders template  │    └───────┬────────┘
                                            │  • calls shared send │            │
                                            └─────────────────────┘    ┌───────┴────────┐
                                                                       │  Postmark       │
                                                                       │  Adapter        │
                         FUTURE MODULE                                 └───────┬────────┘
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐            │
│  Use Case   │───▶│  Own Port         │───▶│  Own Adapter         │───────────┘
│             │    │  (module-owned)   │    │  • own templates     │     ┌────────────┐
└─────────────┘    └──────────────────┘    └─────────────────────┘     │ BullMQ     │
                                                                       │ (optional) │
                                                                       └────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| **Two-layer split**: shared sender + module-owned templates | Each module owns its email content (domain knowledge). Shared layer is a thin delivery mechanism — it doesn't know *what* is being sent. |
| **`EmailSenderPort`** (shared, generic) | Accepts `{ to, subject, html, stream }`. Any module can inject it. No domain-specific methods. |
| **`EmailServicePort`** (identity-owned, domain-specific) | Has 4 identity-specific methods. Its adapter composes: render template + call `EmailSenderPort`. Future modules define their own ports. |
| `base-layout.ts` lives in shared | Common HTML shell (header, footer, brand styles) shared across all modules. Module templates provide the inner body. |
| Module templates live in `modules/<feature>/infrastructure/email/templates/` | Templates are domain knowledge — identity decides what a "verification email" says. |
| HTML built in API via pure template functions | Full control over markup, no external template dependency, testable as pure functions. |
| Optional BullMQ retry | Graceful degradation — if `REDIS_URL` is absent the adapter sends synchronously with error logging. No hard dependency on queue infra. |
| Separate transactional/broadcast streams | Postmark enforces stream separation; using distinct `MessageStream` values keeps deliverability clean. |

---

## 3. Project Structure

```
apps/api/src/
├── shared/
│   └── email/
│       ├── email.module.ts                  # @Global NestJS module: provides EmailSenderPort
│       ├── email-sender.port.ts             # Generic send interface (to, subject, html, stream)
│       ├── postmark-sender.adapter.ts       # Implements EmailSenderPort via Postmark API
│       ├── email.constants.ts               # Injection tokens, stream names, config keys
│       ├── email.config.ts                  # Env validation (Zod) for Postmark settings
│       └── templates/
│           └── base-layout.ts               # Shared HTML shell (header, footer, brand styles)
│
├── modules/identity/
│   ├── application/ports/out/
│   │   └── email-service.port.ts            # UPDATED: add sendLoginAlertEmail (identity-owned)
│   ├── infrastructure/
│   │   ├── email/
│   │   │   ├── identity-email.adapter.ts    # Implements EmailServicePort: render + call EmailSenderPort
│   │   │   └── templates/
│   │   │       ├── verification-email.ts    # Email verification template
│   │   │       ├── password-reset-email.ts  # Password reset template
│   │   │       ├── email-change-email.ts    # Email change confirmation template
│   │   │       └── login-alert-email.ts     # Login alert template
│   │   ├── better-auth/
│   │   │   └── auth.ts                      # UPDATED: wire callbacks to EmailServicePort
│   │   └── ...
│   └── identity.module.ts                   # UPDATED: import EmailModule, bind EmailServicePort
│
apps/api/test/                               # Tests mirror src/ structure
├── shared/
│   └── email/
│       ├── postmark-sender.adapter.spec.ts
│       ├── email.config.spec.ts
│       └── email.module.spec.ts
│
├── modules/identity/
│   └── infrastructure/
│       └── email/
│           ├── identity-email.adapter.spec.ts
│           └── templates.spec.ts            # Snapshot/unit tests for identity templates
```

---

## 4. Core Features & Acceptance Criteria

### 4.1 EmailSenderPort (new — shared, generic)

**File:** `apps/api/src/shared/email/email-sender.port.ts`

The shared layer's contract. Module-agnostic — knows nothing about verification, resets, etc.

```typescript
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  stream?: 'outbound' | 'broadcast';
  tag?: string;
  metadata?: Record<string, string>;
}

export interface BroadcastEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  tag?: string;
  metadata?: Record<string, string>;
}

export abstract class EmailSenderPort {
  abstract send(options: SendEmailOptions): Promise<void>;
  abstract sendBroadcast(options: BroadcastEmailOptions): Promise<void>;
}
```

**AC:**
- [ ] Two methods: `send` (single transactional) and `sendBroadcast` (single or batch marketing).
- [ ] No domain-specific methods — this is pure delivery infrastructure.
- [ ] Defaults `stream` to `"outbound"` when not provided.

---

### 4.2 Postmark Sender Adapter (shared)

**File:** `apps/api/src/shared/email/postmark-sender.adapter.ts`

| Concern | Detail |
|---|---|
| Client | `@postmarkapp/postmark` `ServerClient` |
| Transactional stream | `"outbound"` (default) |
| Broadcast stream | `"broadcast"` (configurable via env) |
| From address | `EMAIL_FROM` env var (e.g. `"App <noreply@example.com>"`) |
| Error handling | Log via Pino (`LOGGER_PORT`). If BullMQ is available, enqueue retry job. Otherwise, log error and resolve (no throw to caller). |

**AC:**
- [ ] Implements `EmailSenderPort.send()` and `EmailSenderPort.sendBroadcast()`.
- [ ] Uses correct `MessageStream` per call (`"outbound"` vs `"broadcast"`).
- [ ] Logs send success/failure with structured context (to, stream, messageId or error).
- [ ] Does not throw — callers never see Postmark errors (fire-and-forget with logging).
- [ ] `sendBroadcast` accepts single or multiple recipients.

---

### 4.3 EmailServicePort (update existing — identity-owned)

**File:** `apps/api/src/modules/identity/application/ports/out/email-service.port.ts`

This is the identity module's domain contract. Add the missing 4th method:

```typescript
export abstract class EmailServicePort {
  abstract sendVerificationEmail(to: string, url: string): Promise<void>;
  abstract sendPasswordResetEmail(to: string, url: string): Promise<void>;
  abstract sendEmailChangeVerificationEmail(to: string, verificationUrl: string): Promise<void>;
  abstract sendLoginAlertEmail(
    to: string,
    deviceName: string,
    ipAddress: string,
    timestamp: Date,
    recoveryUrl: string,
  ): Promise<void>;
}
```

**AC:**
- [ ] Port has 4 abstract methods — all identity-specific.
- [ ] No implementation details leak into the port.
- [ ] No reference to Postmark, `EmailSenderPort`, or HTML — pure domain contract.

---

### 4.4 Identity Email Adapter (identity-owned)

**File:** `apps/api/src/modules/identity/infrastructure/email/identity-email.adapter.ts`

Composes two responsibilities: **render template** + **call shared sender**.

```typescript
@Injectable()
export class IdentityEmailAdapter extends EmailServicePort {
  constructor(private readonly sender: EmailSenderPort) {}

  async sendVerificationEmail(to: string, url: string): Promise<void> {
    const { subject, html } = renderVerificationEmail(url);
    await this.sender.send({ to, subject, html });
  }
  // ... same pattern for the other 3 methods
}
```

**AC:**
- [ ] Implements all 4 `EmailServicePort` methods.
- [ ] Each method calls the corresponding template function, then delegates to `EmailSenderPort.send()`.
- [ ] No direct Postmark dependency — only depends on the shared `EmailSenderPort` abstraction.
- [ ] Registered as the `EmailServicePort` provider in `IdentityModule`.

---

### 4.5 Identity Email Templates (identity-owned)

Each template is a **pure function** in `modules/identity/infrastructure/email/templates/` returning `{ subject: string; html: string }`.

| Template | File | Inputs | Subject line |
|---|---|---|---|
| Verification | `verification-email.ts` | `url: string` | "Verify your email address" |
| Password reset | `password-reset-email.ts` | `url: string` | "Reset your password" |
| Email change | `email-change-email.ts` | `verificationUrl: string` | "Confirm your email change" |
| Login alert | `login-alert-email.ts` | `deviceName, ipAddress, timestamp, recoveryUrl` | "New login to your account" |

All templates call `baseLayout(body)` from `shared/email/templates/base-layout.ts` for the outer HTML shell.

**AC:**
- [ ] All templates produce valid HTML.
- [ ] `base-layout` (shared) wraps all templates with consistent header/footer/styling.
- [ ] Templates are pure functions — no side effects, no DI, no async.
- [ ] CTA buttons use the provided URL and are clearly visible.
- [ ] No user-controlled content is injected without HTML escaping (XSS prevention).
- [ ] Templates live in the identity module, not in shared.

---

### 4.6 Email Module (NestJS — shared)

**File:** `apps/api/src/shared/email/email.module.ts`

```typescript
@Global()
@Module({
  providers: [
    {
      provide: EmailSenderPort,
      useClass: PostmarkSenderAdapter,
    },
  ],
  exports: [EmailSenderPort],
})
export class EmailModule {}
```

**AC:**
- [ ] `@Global()` so any module can inject `EmailSenderPort` without importing `EmailModule` explicitly.
- [ ] Provides `EmailSenderPort` — the generic sender, not any module-specific port.
- [ ] Registered in `AppModule.imports`.

### 4.7 Identity Module DI Wiring

**File:** `apps/api/src/modules/identity/identity.module.ts`

```typescript
providers: [
  // ... existing providers
  { provide: EmailServicePort, useClass: IdentityEmailAdapter },
]
```

**AC:**
- [ ] Identity module binds its own `EmailServicePort` → `IdentityEmailAdapter`.
- [ ] `IdentityEmailAdapter` receives `EmailSenderPort` (from global `EmailModule`) via constructor injection.
- [ ] No email template code in the shared layer.

---

### 4.8 Better Auth Wiring

**File:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts`

The challenge: `auth.ts` runs **outside NestJS DI** (it's a top-level `betterAuth()` call). The adapter cannot be `@Inject()`ed here.

**Approach — deferred injection via setter:**

1. `IdentityEmailAdapter` is instantiated by NestJS DI as normal (receives `EmailSenderPort` via constructor).
2. `IdentityModule.onModuleInit()` retrieves the `EmailServicePort` instance and passes it to a module-level setter (e.g., `setEmailService(instance)`) that `auth.ts` imports.
3. The Better Auth callbacks call through this reference.
4. Before the setter is called (during startup), callbacks log a warning and no-op.

**AC:**
- [ ] `sendResetPassword` callback calls `emailService.sendPasswordResetEmail(user.email, url)`.
- [ ] `sendVerificationEmail` callback calls `emailService.sendVerificationEmail(user.email, url)`.
- [ ] During startup (before DI resolves), callbacks log a warning instead of crashing.
- [ ] No `any` casts. No global mutable state beyond the single setter.

---

### 4.9 Login Alert Email

Wire `sendLoginAlertEmail` in the session creation database hook inside `auth.ts`, after the device + audit log insert, when a **new device** is detected.

**AC:**
- [ ] Login alert sent only when `!existing` (new device login).
- [ ] Email includes device name, IP, timestamp, and account recovery URL.
- [ ] Does not block the session creation flow (fire-and-forget).

---

### 4.10 Configuration & Environment

**File:** `apps/api/src/shared/email/email.config.ts`

```typescript
import { z } from 'zod';

export const emailConfigSchema = z.object({
  POSTMARK_SERVER_TOKEN: z.string().min(1),
  EMAIL_FROM: z.string().email().or(z.string().regex(/^.+<.+@.+\..+>$/)),
  POSTMARK_BROADCAST_STREAM: z.string().default('broadcast'),
  REDIS_URL: z.string().url().optional(),
});
```

**AC:**
- [ ] Validated at module initialization. App fails fast if `POSTMARK_SERVER_TOKEN` or `EMAIL_FROM` is missing.
- [ ] `REDIS_URL` is optional — when absent, BullMQ retry is disabled.
- [ ] `POSTMARK_BROADCAST_STREAM` defaults to `"broadcast"`.

---

### 4.11 Optional BullMQ Retry Queue

Only activated when `REDIS_URL` env var is present.

| Concern | Detail |
|---|---|
| Queue name | `email-send` |
| Job data | `{ to, subject, html, stream, tag?, metadata? }` |
| Retry strategy | 3 attempts, exponential backoff (1s, 4s, 16s) |
| Dead letter | After 3 failures, log to Pino at `error` level with full job context |

**AC:**
- [ ] When `REDIS_URL` is set, failed sends are retried via BullMQ.
- [ ] When `REDIS_URL` is absent, the adapter sends directly and logs errors (no queue, no retry).
- [ ] Queue worker processes jobs using the same Postmark client.
- [ ] No BullMQ imports at the top level if `REDIS_URL` is absent (dynamic import or conditional module registration).

---

## 5. Code Style & Conventions

Per project CLAUDE.md and API CLAUDE.md:

- **No `any`/`as any`** — strict TypeScript throughout.
- **Explicit return types** on all exported functions.
- **Immutable data** — spread/map, never mutate.
- **No `console.log`** — use Pino via `LOGGER_PORT`.
- **Biome** for lint/format (`npx turbo lint`).
- **Domain exceptions** carry error codes, not messages. Add `EMAIL_SEND_FAILED` code if needed (for internal observability, not exposed to HTTP).
- **File size** — keep each file under 400 lines; 800 absolute max.
- **HTML escaping** — all dynamic values in email templates must be escaped.

---

## 6. Testing Strategy

All tests live in `apps/api/test/` mirroring the `src/` structure (project convention).

### Unit tests (Vitest)

**Shared layer** (`apps/api/test/shared/email/`):

| Test file | What it covers |
|---|---|
| `postmark-sender.adapter.spec.ts` | `send()` and `sendBroadcast()`. Mock Postmark `ServerClient`. Assert correct params (to, from, stream, html). Assert errors are caught and logged, never thrown. |
| `email.config.spec.ts` | Zod schema validation: valid config passes, missing token fails, optional REDIS_URL works. |

**Identity layer** (`apps/api/test/modules/identity/infrastructure/email/`):

| Test file | What it covers |
|---|---|
| `identity-email.adapter.spec.ts` | All 4 methods. Mock `EmailSenderPort`. Assert each method renders the correct template and calls `sender.send()` with expected `{ to, subject, html }`. |
| `templates.spec.ts` | Each template function returns valid `{ subject, html }`. Assert HTML contains expected dynamic values (escaped). Assert all templates call `baseLayout`. Snapshot tests for regression. |

### Integration tests

**Shared layer** (`apps/api/test/shared/email/`):

| Test file | What it covers |
|---|---|
| `email.module.spec.ts` | NestJS `Test.createTestingModule` — verify `EmailSenderPort` is resolvable globally. |

**Identity layer** (`apps/api/test/modules/identity/infrastructure/email/`):

| Test file | What it covers |
|---|---|
| Identity module DI test | Verify `EmailServicePort` resolves to `IdentityEmailAdapter` with `EmailSenderPort` injected. |
| Better Auth callback test | Verify `sendResetPassword` and `sendVerificationEmail` callbacks invoke the email service (mock the adapter, trigger the callback). |

### Coverage target

- 80%+ on `apps/api/src/shared/email/**`
- 80%+ on `apps/api/src/modules/identity/infrastructure/email/**`

---

## 7. Boundaries

### Always do

- Validate env vars at startup — fail fast.
- HTML-escape all dynamic content in templates.
- Log every send attempt (success or failure) with structured context.
- Use the `"outbound"` stream for transactional, `"broadcast"` for marketing.
- Keep templates as pure functions.

### Ask first

- Adding new email types beyond the 4 specified in identity.
- Changing `EmailSenderPort` or `EmailServicePort` interfaces after initial implementation.
- Adding Postmark webhook handling (bounces, complaints, delivery events).
- Adding attachment support.

### Never do

- Store Postmark tokens in code — env vars only.
- Expose raw Postmark error details in HTTP responses.
- Send emails synchronously in the request path (always fire-and-forget from the caller's perspective).
- Use `[innerHTML]` or bypass sanitization in any email-related frontend code.
- Add Postmark as a dependency in packages outside `apps/api`.

---

## 8. Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@postmarkapp/postmark` | latest | Postmark API client |
| `bullmq` | latest | Optional retry queue (only if `REDIS_URL` set) |

**Remove:** `nodemailer` — currently in `apps/api/package.json` but unused after SMTP adapter deletion.

---

## 9. Implementation Order

| Phase | Tasks | Depends on |
|---|---|---|
| **P1 — Shared infra** | Add `@postmarkapp/postmark` dep. Create `EmailSenderPort`, `email.config.ts`, `email.constants.ts`. | — |
| **P2 — Shared adapter** | Create `PostmarkSenderAdapter` implementing `EmailSenderPort`. Create `EmailModule` (`@Global`). Register in `AppModule`. Write shared adapter tests. | P1 |
| **P3 — Shared layout** | Create `base-layout.ts` in shared templates. | — |
| **P4 — Identity templates** | Create 4 identity template functions in `modules/identity/infrastructure/email/templates/`. Write template tests. | P3 |
| **P5 — Identity adapter** | Create `IdentityEmailAdapter` implementing `EmailServicePort`. Update `EmailServicePort` with `sendLoginAlertEmail`. Register in `IdentityModule`. Write adapter tests. | P2, P4 |
| **P6 — Better Auth wiring** | Wire Better Auth callbacks + login alert hook via deferred setter. | P5 |
| **P7 — Broadcast** | `sendBroadcast` already on `EmailSenderPort` from P1. Verify with tests. | P2 |
| **P8 — Optional BullMQ** | Optional retry queue (if `REDIS_URL`). | P2 |
| **P9 — Cleanup** | Remove `nodemailer` from `package.json`. Final lint + typecheck + tests. | All |

---

## 10. Open Questions

1. **Email "from" name** — what sender name/email should be used? (e.g., `"MyApp <noreply@myapp.com>"`)
2. **Recovery URL for login alerts** — is there an existing account recovery endpoint, or does it need to be built?
3. **Broadcast recipients** — will there be a recipient list/segment system, or is broadcast called ad-hoc by other modules?
4. **Rate limits** — does Postmark plan tier impose any sending limits we should be aware of?
