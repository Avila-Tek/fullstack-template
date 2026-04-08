# TODO: Postmark Email Integration

**Plan:** `docs/plans/postmark-integration-plan.md`
**Spec:** `docs/specs/postmark-integration.md`

---

## Phase 1 — Foundation (T1 + T3, parallel)

- [ ] **T1: Shared email infrastructure**
  - [ ] Create `src/shared/email/email-sender.port.ts` (SendEmailOptions, BroadcastEmailOptions, EmailSenderPort)
  - [ ] Create `src/shared/email/email.constants.ts` (stream name constants)
  - [ ] Create `src/shared/email/email.config.ts` (Zod schema for env vars)
  - [ ] Update `src/env.ts` (assert POSTMARK_SERVER_TOKEN, EMAIL_FROM)
  - [ ] Verify: `npx turbo typecheck --filter @repo/api`

- [ ] **T3: Base HTML layout template**
  - [ ] Create `src/shared/email/templates/base-layout.ts` (baseLayout + escapeHtml)
  - [ ] Verify: `npx turbo typecheck --filter @repo/api`

## Phase 2 — Adapters + Templates (T2 + T4, parallel)

- [ ] **T2: Postmark sender adapter + email module**
  - [ ] Install `@postmarkapp/postmark`
  - [ ] Create `src/shared/email/postmark-sender.adapter.ts`
  - [ ] Create `src/shared/email/email.module.ts` (@Global)
  - [ ] Register EmailModule in `src/app.module.ts`
  - [ ] Create `test/shared/email/postmark-sender.adapter.spec.ts`
  - [ ] Create `test/shared/email/email.config.spec.ts`
  - [ ] Verify: tests pass, typecheck, lint

- [ ] **T4: Identity email templates**
  - [ ] Create `modules/identity/infrastructure/email/templates/verification-email.ts`
  - [ ] Create `modules/identity/infrastructure/email/templates/password-reset-email.ts`
  - [ ] Create `modules/identity/infrastructure/email/templates/email-change-email.ts`
  - [ ] Create `modules/identity/infrastructure/email/templates/login-alert-email.ts`
  - [ ] Create `test/modules/identity/infrastructure/email/templates.spec.ts`
  - [ ] Verify: tests pass, typecheck

## Phase 3 — Identity Adapter (T5)

- [ ] **T5: Identity email adapter + DI wiring**
  - [ ] Add `sendLoginAlertEmail` to `EmailServicePort`
  - [ ] Create `modules/identity/infrastructure/email/identity-email.adapter.ts`
  - [ ] Register `{ provide: EmailServicePort, useClass: IdentityEmailAdapter }` in IdentityModule
  - [ ] Create `test/modules/identity/infrastructure/email/identity-email.adapter.spec.ts`
  - [ ] Verify: tests pass, typecheck, lint

### CHECKPOINT 1 — Full email path wired, all tests green

## Phase 4 — Better Auth Integration (T6)

- [ ] **T6: Better Auth callback wiring + login alert**
  - [ ] Create `modules/identity/infrastructure/email/email-service-bridge.ts` (set/get)
  - [ ] Wire `sendResetPassword` callback in auth.ts
  - [ ] Wire `sendVerificationEmail` callback in auth.ts
  - [ ] Add login alert in session creation hook (new device only)
  - [ ] Implement `OnModuleInit` in IdentityModule (call setEmailService)
  - [ ] Verify: typecheck, lint, all tests pass

### CHECKPOINT 2 — Full integration complete

## Phase 5 — Enhancement (T7)

- [ ] **T7: Optional BullMQ retry queue**
  - [ ] Install `bullmq`
  - [ ] Create `src/shared/email/email-retry.queue.ts`
  - [ ] Update PostmarkSenderAdapter (enqueue on failure if queue available)
  - [ ] Update EmailModule (conditional queue registration)
  - [ ] Create `test/shared/email/email-retry.queue.spec.ts`
  - [ ] Verify: tests pass, typecheck

## Phase 6 — Cleanup (T8)

- [ ] **T8: Final cleanup + validation**
  - [ ] Remove `nodemailer` from package.json
  - [ ] Run `npm install` to update lockfile
  - [ ] Verify no nodemailer imports remain
  - [ ] Full validation: typecheck + lint + tests + coverage (80%+)
