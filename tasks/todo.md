# Task List: Identity Module Migration

**Plan:** tasks/plan.md  
**Branch:** feat/new-template  
**Status:** Confirmed — ready for implementation

---

## Phase 0 — Baseline Fix

- [ ] **T0.1** Audit all `@repo/swagger` import sites in `apps/api/src/`
- [ ] **T0.2** Replace `@repo/swagger` usage with direct `@nestjs/swagger` imports; remove the package dep
- [ ] **T0.3** Identify all missing `@repo/utils` exports (`LOGGER_PORT`, `DomainException`, `httpMessages`, `IStructuredLogger`, `parseLocale`, `resolveMessage`, `redactPii`, `SupportedLocale`, `HttpErrorCode`) and inline replacements in `apps/api/src/shared/`
- [ ] **T0.4** Identify all missing `@repo/schemas` exports (`ApiResponse`, `FieldError`) and inline replacements in `apps/api/src/shared/`
- [ ] **T0.5** Install missing npm packages: `nestjs-pino pino vitest vite-tsconfig-paths` in `apps/api`
- [ ] **T0.6** Run `npx turbo typecheck --filter @repo/api` — must exit 0
- [ ] **T0.7** Run `npx turbo lint --filter @repo/api` — must exit 0

---

## Phase 1 — Scaffold Identity Module

- [ ] **T1.1** Create all empty stub files listed in plan.md §Slice 2
- [ ] **T1.2** Run `npx turbo typecheck --filter @repo/api` — must still exit 0

---

## Phase 2 — Domain Layer Migration

- [ ] **T2.1** Migrate `domain/events/domain-event.ts` (1:1 copy)
- [ ] **T2.2** Migrate `domain/entities/user.entity.ts` (1:1 copy)
- [ ] **T2.3** Migrate `domain/value-objects/password.value-object.ts` (1:1 copy)
- [ ] **T2.4** Migrate `domain/value-objects/user.value-object.ts` (1:1 copy)
- [ ] **T2.5** Migrate domain exceptions — rename all `AUTH_*` codes to `IDENTITY_*`
  - `invalid-credentials.exception.ts`
  - `invalid-password.exception.ts`
  - `no-password-account.exception.ts`
  - `password-reuse.exception.ts`
- [ ] **T2.6** Run `npx turbo typecheck --filter @repo/api` — must exit 0

---

## Phase 3 — Application Layer Migration

- [ ] **T3.1** Migrate all 9 outbound port interfaces (`application/ports/out/`)
- [ ] **T3.2** Migrate inbound port interface (`application/ports/in/change-password.use-case.port.ts`)
- [ ] **T3.3** Migrate `change-password.use-case.ts` — update error code imports if needed
- [ ] **T3.4** Run `npx turbo typecheck --filter @repo/api` — must exit 0

---

## Phase 4 — Infrastructure Layer Migration

> T4a–T4d can be implemented in parallel.

### T4a — Drizzle Schemas

- [ ] **T4a.1** Copy all 11 schema files from `apps/auth/src/infrastructure/database/schema/` to `apps/api/src/modules/identity/infrastructure/persistence/schema/`
- [ ] **T4a.2** Author `email-change-verification.schema.ts` (confirmed needed)
- [ ] **T4a.3** Remove any `AUTH_DATABASE_URL` references from schema files
- [ ] **T4a.4** Run `npx turbo typecheck --filter @repo/api` — must exit 0

### T4b — Repository Adapters

- [ ] **T4b.1** Copy 4 adapter files from `apps/auth/src/infrastructure/database/repositories/`
- [ ] **T4b.2** Replace `AUTH_DRIZZLE_CLIENT` inject token with `DRIZZLE_CLIENT` from `@/infrastructure/database/drizzle.module`
- [ ] **T4b.3** Verify each adapter implements its port interface
- [ ] **T4b.4** Run `npx turbo typecheck --filter @repo/api` — must exit 0

### T4c — Better Auth Singleton + Hooks

- [ ] **T4c.1** Install missing packages: `better-auth @better-auth/drizzle-adapter @thallesp/nestjs-better-auth argon2 ioredis nodemailer` in `apps/api`
- [ ] **T4c.2** Copy `apps/auth/src/infrastructure/better-auth/auth.ts` → pass existing `pg.Pool` from `DRIZZLE_CLIENT` into Better Auth's Drizzle adapter (no second pool)
- [ ] **T4c.3** Copy 4 hook files (`sign-up.hooks.ts`, `sign-in.hooks.ts`, `sign-out.hooks.ts`, `google-oauth.hooks.ts`)
- [ ] **T4c.4** Run `npx turbo typecheck --filter @repo/api` — must exit 0

### T4d — Side Adapters

- [ ] **T4d.1** Migrate `hash/argon2-hash-adapter.ts`
- [ ] **T4d.2** Migrate `email/smtp-email-adapter.ts`
- [ ] **T4d.3** Migrate `captcha/google-captcha-adapter.ts`
- [ ] **T4d.4** Migrate `token/hmac-token-adapter.ts`
- [ ] **T4d.5** Migrate `audit-log/drizzle-audit-log-adapter.ts`
- [ ] **T4d.6** Migrate `terms-version/env-terms-version-adapter.ts`
- [ ] **T4d.7** Migrate `redis/redis.module.ts` + `redis/redis.constants.ts`
- [ ] **T4d.8** Migrate `guards/admin-bearer.guard.ts`
- [ ] **T4d.9** Migrate `rate-limit/signup-ip-rate-limit.middleware.ts`
- [ ] **T4d.10** Migrate `web/better-auth-docs.module.ts` + `web/better-auth-virtual.controller.ts`
- [ ] **T4d.11** Migrate `web/change-password.controller.ts`
- [ ] **T4d.12** Migrate `i18n/messages.ts` — update error code strings to `IDENTITY_*`; spread into `infrastructure/i18n/domainMessages.ts`
- [ ] **T4d.13** Run `npx turbo typecheck --filter @repo/api` — must exit 0

---

## Phase 5 — Module Wiring

- [ ] **T5.1** Implement `identity.module.ts` — register all providers, controllers, middleware
- [ ] **T5.2** Add `IdentityModule` to `app.module.ts` imports
- [ ] **T5.3** Run `npx turbo typecheck --filter @repo/api` — must exit 0

---

## Phase 6 — Env Vars + Bootstrap

- [ ] **T6.1** Create `apps/api/src/env.ts` with all required vars from SPEC §2 Phase 4
- [ ] **T6.2** Install `jsonwebtoken` and `@types/jsonwebtoken` in `apps/api` (if not already present)
- [ ] **T6.2b** Rewrite `apps/api/src/shared/guards/jwt-auth.guard.ts` — replace JWKS fetch with direct RS256 decode using `AUTH_PUBLIC_KEY` via `jsonwebtoken`; remove `AUTH_JWKS_URL` dependency
- [ ] **T6.3** Update `apps/api/src/main.ts`:
  - Import `./env` (side-effect, runs validation)
  - Set `bodyParser: false` on `NestFactory.create()`
  - Add selective JSON middleware (exclude `/api/v1/auth/*`)
  - Replace CORS trusted origin logic with `CLIENT_URL` and `ADMIN_URL` env vars
- [ ] **T6.4** Run `npx turbo typecheck --filter @repo/api` — must exit 0
- [ ] **T6.5** Run `npx turbo lint --filter @repo/api` — must exit 0

> **CHECKPOINT A**: Both commands in T6.4 and T6.5 must pass before proceeding.

---

## Phase 7 — Tests

- [ ] **T7.1** Write `domain/value-objects/password.value-object.spec.ts`
- [ ] **T7.2** Write `domain/value-objects/user.value-object.spec.ts`
- [ ] **T7.3** Write `domain/entities/user.entity.spec.ts`
- [ ] **T7.4** Write `application/use-cases/change-password.use-case.spec.ts`
- [ ] **T7.5** Write `infrastructure/persistence/repositories/drizzle-user-repository.adapter.spec.ts`
- [ ] **T7.6** Write `infrastructure/hash/argon2-hash-adapter.spec.ts`
- [ ] **T7.7** Write `infrastructure/web/change-password.controller.spec.ts`
- [ ] **T7.8** Run `npm -C apps/api test` — must exit 0
- [ ] **T7.9** Run `npm -C apps/api test:coverage` — identity module coverage must be ≥80%

> **CHECKPOINT B**: Coverage ≥80% required before proceeding to cleanup.

---

## Phase 8 — Cleanup

- [ ] **T8.1** `git rm -r apps/auth`
- [ ] **T8.2** Remove `apps/auth` from root `package.json` workspaces
- [ ] **T8.3** Remove `apps/auth` entries from `turbo.json` (if any)
- [ ] **T8.4** Update CI configuration (if any) removing `apps/auth` references
- [ ] **T8.5** Remove `@repo/swagger` from `apps/api/package.json` (if still listed)
- [ ] **T8.6** Run `npm install` to sync lockfile
- [ ] **T8.7** Run `npx turbo typecheck` (full monorepo, no filter) — must exit 0
- [ ] **T8.8** Run `npx turbo lint` (full monorepo) — must exit 0

> **CHECKPOINT C**: Full monorepo clean — migration complete.

---

## Confirmed Decisions (all questions answered)

| # | Decision |
|---|---|
| Q1 | `email-change-verification.schema.ts` → **include in T4a** |
| Q2 | JWT guard → **decode RS256 directly via `AUTH_PUBLIC_KEY`; remove `AUTH_JWKS_URL`** |
| Q3 | Better Auth DB → **reuse existing Drizzle `pg.Pool`** |
| Q4 | CORS origins → **`CLIENT_URL` + `ADMIN_URL` env vars** |
| Q5 | Redis failure → **silent fallback; no startup crash** |
