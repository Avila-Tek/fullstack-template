# Plan: Postmark Email Integration

**Spec:** `docs/specs/postmark-integration.md`
**Branch:** `feat/auth-integration-template`
**Date:** 2026-04-08

---

## Context

The API has an `EmailServicePort` in the identity module with 3 methods but **no adapter implementation**. Better Auth callbacks at `auth.ts:131-141` (sendResetPassword) and `auth.ts:210-221` (sendVerificationEmail) are TODO stubs. The session hook at `auth.ts:275-318` detects new devices but sends no alerts.

This plan wires Postmark as the transactional email provider via a **two-layer architecture**:

- **Shared layer** (`src/shared/email/`) — generic `EmailSenderPort` for delivery
- **Module layer** (`modules/identity/infrastructure/email/`) — identity-owned templates + adapter

---

## Dependency Graph

```
T1 (Shared infra)  ──────> T2 (Postmark adapter + module) ──────> T5 (Identity adapter + DI) ──> T6 (Auth wiring)
                                      |                                        ^
                                      +-------> T7 (BullMQ optional) ----------+
                                                                               |
T3 (Base layout)   ──────> T4 (Identity templates) ----------------------------+

T8 (Cleanup) depends on all above.
```

**Parallelism:** T1 || T3. Then T2 || T4. T7 is independent after T2.

---

## Tasks

### T1: Shared Email Infrastructure (Foundation)

**Depends on:** Nothing

**Create:**
- `apps/api/src/shared/email/email-sender.port.ts` — `EmailSenderPort` abstract class with `send()` + `sendBroadcast()`
- `apps/api/src/shared/email/email.constants.ts` — stream name constants
- `apps/api/src/shared/email/email.config.ts` — Zod schema for `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`, `POSTMARK_BROADCAST_STREAM`, `REDIS_URL`

**Modify:**
- `apps/api/src/env.ts` — add `assertEnv('POSTMARK_SERVER_TOKEN')`, `assertEnv('EMAIL_FROM')`

**AC:**
- [ ] `EmailSenderPort` has `send(SendEmailOptions)` and `sendBroadcast(BroadcastEmailOptions)` — no domain methods
- [ ] `SendEmailOptions.stream` defaults to `'outbound'` (enforced in adapter)
- [ ] Config schema fails fast on missing `POSTMARK_SERVER_TOKEN` or `EMAIL_FROM`
- [ ] `REDIS_URL` is optional
- [ ] No `any` types

**Verify:** `npx turbo typecheck --filter @repo/api`

---

### T2: Postmark Sender Adapter + Email Module + Tests

**Depends on:** T1

**Create:**
- `apps/api/src/shared/email/postmark-sender.adapter.ts` — implements `EmailSenderPort` via `@postmarkapp/postmark` `ServerClient`
- `apps/api/src/shared/email/email.module.ts` — `@Global()` module providing `EmailSenderPort`
- `apps/api/test/shared/email/postmark-sender.adapter.spec.ts`
- `apps/api/test/shared/email/email.config.spec.ts`

**Modify:**
- `apps/api/src/app.module.ts` — add `EmailModule` to imports
- `apps/api/package.json` — add `@postmarkapp/postmark`

**Key details:**
- Adapter injects `LOGGER_PORT` for structured logging
- `send()` and `sendBroadcast()` never throw — fire-and-forget with logging
- Uses `MessageStream` per call: `'outbound'` vs configured broadcast stream
- Pattern: same as `DrizzleModule` at `src/infrastructure/database/drizzle.module.ts`

**AC:**
- [ ] Implements both `send()` and `sendBroadcast()`
- [ ] Correct `MessageStream` per call
- [ ] Logs success/failure with structured context — never throws
- [ ] `EmailModule` is `@Global()`, exports `EmailSenderPort`
- [ ] Registered in `AppModule.imports`
- [ ] Tests mock `ServerClient`, 80%+ coverage

**Verify:**
```
npx turbo typecheck --filter @repo/api
npm -C apps/api test -- --run test/shared/email/
npx turbo lint --filter @repo/api
```

---

### T3: Base HTML Layout Template

**Depends on:** Nothing (parallel with T1)

**Create:**
- `apps/api/src/shared/email/templates/base-layout.ts` — `baseLayout(body)` + `escapeHtml(text)`

**Key details:**
- Pure functions, no DI, no async
- Inline CSS for email client compatibility
- Brand header, content area, footer
- `escapeHtml` handles `& < > " '`

**AC:**
- [ ] `baseLayout()` returns valid HTML5 document with inline styles
- [ ] `escapeHtml()` escapes all 5 dangerous characters
- [ ] Both are pure functions, no side effects
- [ ] Lives in `src/shared/email/templates/`, not in any module

**Verify:** `npx turbo typecheck --filter @repo/api`

---

### T4: Identity Email Templates + Tests

**Depends on:** T3

**Create:**
- `apps/api/src/modules/identity/infrastructure/email/templates/verification-email.ts`
- `apps/api/src/modules/identity/infrastructure/email/templates/password-reset-email.ts`
- `apps/api/src/modules/identity/infrastructure/email/templates/email-change-email.ts`
- `apps/api/src/modules/identity/infrastructure/email/templates/login-alert-email.ts`
- `apps/api/test/modules/identity/infrastructure/email/templates.spec.ts`

**Key details:**
- Each exports a pure function returning `{ subject: string; html: string }`
- All call `baseLayout()` from shared and `escapeHtml()` for dynamic values
- Login alert includes device/IP/timestamp/recovery URL in detail table

**AC:**
- [ ] 4 pure functions in `modules/identity/infrastructure/email/templates/`
- [ ] All call `baseLayout()` and `escapeHtml()`
- [ ] CTA buttons use provided URLs
- [ ] XSS test: `<script>` input produces `&lt;script&gt;`
- [ ] Snapshot tests for regression

**Verify:**
```
npm -C apps/api test -- --run test/modules/identity/infrastructure/email/templates.spec.ts
npx turbo typecheck --filter @repo/api
```

---

### T5: Identity Email Adapter + DI Wiring + Tests

**Depends on:** T2, T4

**Create:**
- `apps/api/src/modules/identity/infrastructure/email/identity-email.adapter.ts`
- `apps/api/test/modules/identity/infrastructure/email/identity-email.adapter.spec.ts`

**Modify:**
- `apps/api/src/modules/identity/application/ports/out/email-service.port.ts` — add `sendLoginAlertEmail(to, deviceName, ipAddress, timestamp, recoveryUrl)`
- `apps/api/src/modules/identity/identity.module.ts` — add `{ provide: EmailServicePort, useClass: IdentityEmailAdapter }`

**Key details:**
- `IdentityEmailAdapter` extends `EmailServicePort`, injects `EmailSenderPort` (from global module)
- Each method: render template -> call `sender.send({ to, subject, html })`
- Tests: direct instantiation, mock `EmailSenderPort` with `vi.fn()`

**AC:**
- [ ] `EmailServicePort` now has 4 abstract methods
- [ ] `IdentityEmailAdapter` implements all 4
- [ ] No direct Postmark dependency — only depends on `EmailSenderPort`
- [ ] Registered in `IdentityModule` providers
- [ ] Tests cover all 4 methods, 80%+ coverage

**Verify:**
```
npm -C apps/api test -- --run test/modules/identity/infrastructure/email/
npx turbo typecheck --filter @repo/api
npx turbo lint --filter @repo/api
```

---

### CHECKPOINT 1 — Full email path wired (after T1-T5)

```
UseCase -> EmailServicePort -> IdentityEmailAdapter -> render template -> EmailSenderPort -> PostmarkSenderAdapter -> Postmark API
```

```
npx turbo typecheck --filter @repo/api
npm -C apps/api test
npx turbo lint --filter @repo/api
```

---

### T6: Better Auth Callback Wiring + Login Alert Hook

**Depends on:** T5 + Checkpoint 1

**Create:**
- `apps/api/src/modules/identity/infrastructure/email/email-service-bridge.ts` — deferred setter (`setEmailService` / `getEmailService`)

**Modify:**
- `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` — wire callbacks + login alert in session hook
- `apps/api/src/modules/identity/identity.module.ts` — implement `OnModuleInit`, inject `ModuleRef`, call `setEmailService()`

**Key details — bridge pattern:**
`auth.ts` runs at module load time, outside NestJS DI. Callbacks execute at runtime after DI resolves. The bridge exposes a setter called once in `onModuleInit()` and a getter used in callbacks. Before `onModuleInit`, callbacks silently no-op.

- `sendResetPassword` -> `void emailService.sendPasswordResetEmail(user.email, url)`
- `sendVerificationEmail` -> `void emailService.sendVerificationEmail(user.email, url)`
- Session hook `!existing` -> lookup user email -> `void emailService.sendLoginAlertEmail(...)`
- All use `void` prefix (fire-and-forget, do not block auth flow)

**AC:**
- [ ] `sendResetPassword` callback wired
- [ ] `sendVerificationEmail` callback wired
- [ ] Login alert fires only on new device (`!existing`)
- [ ] Login alert includes device name, IP, timestamp, recovery URL
- [ ] All callbacks fire-and-forget (`void`, no `await`)
- [ ] Before DI resolves, callbacks silently no-op
- [ ] No `any` casts in bridge
- [ ] `IdentityModule` implements `OnModuleInit`

**Verify:**
```
npx turbo typecheck --filter @repo/api
npm -C apps/api test
npx turbo lint --filter @repo/api
```

---

### CHECKPOINT 2 — Full integration complete (after T6)

All 4 email types work end-to-end. Better Auth callbacks wired. Login alerts on new device detection.

---

### T7: Optional BullMQ Retry Queue (Enhancement)

**Depends on:** T2 (independent of T4-T6)

**Create:**
- `apps/api/src/shared/email/email-retry.queue.ts` — queue + worker factory
- `apps/api/test/shared/email/email-retry.queue.spec.ts`

**Modify:**
- `apps/api/src/shared/email/postmark-sender.adapter.ts` — on failure, enqueue retry if queue available
- `apps/api/src/shared/email/email.module.ts` — conditional queue registration when `REDIS_URL` set
- `apps/api/package.json` — add `bullmq`

**Key details:**
- Queue name: `email-send`
- Retry: 3 attempts, exponential backoff (1s, 4s, 16s)
- Dead letter: log at `error` level after 3 failures
- No BullMQ imports if `REDIS_URL` absent (conditional module registration)
- Adapter receives optional queue via `@Optional() @Inject()`

**AC:**
- [ ] Failed sends enqueued when `REDIS_URL` set
- [ ] Direct send + log when `REDIS_URL` absent
- [ ] 3 retries, exponential backoff
- [ ] Error-level log on final failure
- [ ] No BullMQ at top level without `REDIS_URL`

**Verify:**
```
npm -C apps/api test -- --run test/shared/email/email-retry.queue.spec.ts
npx turbo typecheck --filter @repo/api
```

---

### T8: Cleanup + Final Validation

**Depends on:** All previous tasks

**Modify:**
- `apps/api/package.json` — remove `nodemailer`

**AC:**
- [ ] `nodemailer` removed from `package.json`
- [ ] No `nodemailer` imports in codebase
- [ ] All tests pass
- [ ] TypeCheck passes
- [ ] Lint passes
- [ ] No `console.log` in new/modified files
- [ ] No `any`/`as any` in new/modified files
- [ ] All new files under 400 lines
- [ ] 80%+ coverage on `src/shared/email/**` and `modules/identity/infrastructure/email/**`

**Verify:**
```
npm -C apps/api install
npx turbo typecheck --filter @repo/api
npm -C apps/api test -- --coverage
npx turbo lint --filter @repo/api
```

---

## Risk Areas

| Risk | Mitigation |
|---|---|
| **Bridge pattern** (mutable module-level state in T6) | Single file, set/get only. Called once in `onModuleInit`. Document why it's necessary. |
| **Postmark `ServerClient` mocking** (T2) | Use `vi.mock('@postmarkapp/postmark')` at test file level. |
| **Login alert needs user email lookup** (T6) | Session hook only has `userId`. Add a single SELECT query to `user` table — acceptable cost for new-device-only path. |
| **Fire-and-forget unhandled rejections** | `PostmarkSenderAdapter.send()` never throws (catches + logs). `void` prefix on calls is safe. |

## Reuse Points

| Existing code | Reuse in |
|---|---|
| `DrizzleModule` pattern (`@Global()` + Symbol token) | `EmailModule` |
| `Argon2HashAdapter` pattern (`@Injectable()` + `LOGGER_PORT`) | `PostmarkSenderAdapter` |
| `ChangePasswordUseCase` test pattern (mock deps, direct instantiation) | All adapter tests |
| `parseDeviceName` / `parseDeviceType` from `shared/utils/user-agent-parser` | Already used in session hook; login alert reuses `deviceName` |
| `normalizeEmail` from `shared/utils/normalize-email` | Not needed (Postmark handles delivery) |

## Critical Files

- `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` — TODO stubs + session hook
- `apps/api/src/modules/identity/application/ports/out/email-service.port.ts` — existing port (needs 4th method)
- `apps/api/src/modules/identity/identity.module.ts` — DI wiring + OnModuleInit
- `apps/api/src/app.module.ts` — register EmailModule
- `apps/api/src/shared/domain-utils.ts` — `LOGGER_PORT`, `IStructuredLogger`
- `apps/api/src/infrastructure/database/drizzle.module.ts` — reference pattern for @Global() module
