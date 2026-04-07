# Migration Plan: apps/auth → apps/api Identity Module

**Spec:** SPEC.md  
**Date:** 2026-04-07  
**Branch:** feat/new-template  
**Status:** Confirmed — ready for implementation

---

## Dependency Graph

```
[T0] Fix existing API TS errors
        │
        ▼
[T1] Scaffold identity module (empty files)
        │
        ▼
[T2] Migrate domain layer (entities, VOs, exceptions, events)
        │
        ▼
[T3] Migrate application layer (ports, use-case)
        │
        ▼
[T4a] Migrate infrastructure — schemas (11 Drizzle tables)
[T4b] Migrate infrastructure — Drizzle adapters (4 repos)
[T4c] Migrate infrastructure — Better Auth singleton + hooks
[T4d] Migrate infrastructure — side adapters (hash, email, captcha, token, audit, terms, redis)
        │ (all T4x in parallel, no cross-deps among them)
        ▼
[T5] Wire identity.module.ts + register in app.module.ts
        │
        ▼
[T6] Env vars + bootstrap body-parser split
        │
        ├─── CHECKPOINT A: `npx turbo typecheck --filter @repo/api` passes ───┐
        │                  `npx turbo lint --filter @repo/api` passes         │
        ▼                                                                      │
[T7] Write tests for all identity layers (≥80% coverage)                      │
        │                                                                      │
        ├─── CHECKPOINT B: `npm -C apps/api test:coverage` ≥80% ─────────────┤
        ▼                                                                      │
[T8] Delete apps/auth + clean workspace references                             │
        │                                                                      │
        └─── CHECKPOINT C: `npx turbo typecheck` (full monorepo) passes ──────┘
```

---

## Vertical Slices

Each slice is an end-to-end path through a complete concern — not a horizontal layer sweep.

---

### Slice 1 — Baseline Fix (T0)

**Goal:** Zero TypeScript errors in `apps/api` before touching identity code.

**Root causes (from SPEC §2, Phase 0):**

| Error | Fix |
|---|---|
| `@repo/swagger` not found | Remove package dep; replace usage with direct `@nestjs/swagger` imports |
| `@repo/utils` missing exports (`LOGGER_PORT`, `DomainException`, `httpMessages`, `IStructuredLogger`, `parseLocale`, `resolveMessage`, `redactPii`, `SupportedLocale`, `HttpErrorCode`) | Inline in `apps/api/src/shared/` — do NOT modify shared packages |
| `@repo/schemas` missing exports (`ApiResponse`, `FieldError`) | Inline in `apps/api/src/shared/` |
| `nestjs-pino`, `pino` not installed | `npm install nestjs-pino pino -w apps/api` |
| `vitest`, `vite-tsconfig-paths` not installed | `npm install -D vitest vite-tsconfig-paths -w apps/api` |

**What NOT to touch:** `@repo/utils` and `@repo/schemas` source files — only create local replacements in `apps/api/src/shared/`.

**Acceptance criteria:**
- [ ] `npx turbo typecheck --filter @repo/api` exits 0
- [ ] `npx turbo lint --filter @repo/api` exits 0

---

### Slice 2 — Scaffold (T1)

**Goal:** Create all identity module files as empty stubs so typecheck stays green through the build.

**Files to create** (full list from SPEC §2, Phase 1):

```
apps/api/src/modules/identity/
  domain/
    entities/user.entity.ts
    value-objects/password.value-object.ts
    value-objects/user.value-object.ts
    exceptions/invalid-credentials.exception.ts
    exceptions/invalid-password.exception.ts
    exceptions/no-password-account.exception.ts
    exceptions/password-reuse.exception.ts
    events/domain-event.ts
  application/
    ports/in/change-password.use-case.port.ts
    ports/out/user-repository.port.ts
    ports/out/account-repository.port.ts
    ports/out/session-repository.port.ts
    ports/out/password-history-repository.port.ts
    ports/out/email-service.port.ts
    ports/out/password-hash-service.port.ts
    ports/out/token-service.port.ts
    ports/out/audit-log-service.port.ts
    ports/out/device-repository.port.ts
    ports/out/captcha-service.port.ts
    ports/out/terms-version-service.port.ts
    use-cases/change-password.use-case.ts
  infrastructure/
    better-auth/auth.ts
    persistence/schema/user.schema.ts
    persistence/schema/session.schema.ts
    persistence/schema/account.schema.ts
    persistence/schema/verification.schema.ts
    persistence/schema/password-history.schema.ts
    persistence/schema/two-factor.schema.ts
    persistence/schema/device.schema.ts
    persistence/schema/login-audit-log.schema.ts
    persistence/schema/signup-audit-log.schema.ts
    persistence/schema/jwks.schema.ts
    persistence/schema/rate-limit.schema.ts
    persistence/schema/email-change-verification.schema.ts
    repositories/drizzle-user-repository.adapter.ts
    repositories/drizzle-account-repository.adapter.ts
    repositories/drizzle-session-repository.adapter.ts
    repositories/drizzle-password-history-repository.adapter.ts
    web/change-password.controller.ts
    web/better-auth-docs.module.ts
    web/better-auth-virtual.controller.ts
    hash/argon2-hash-adapter.ts
    email/smtp-email-adapter.ts
    captcha/google-captcha-adapter.ts
    token/hmac-token-adapter.ts
    audit-log/drizzle-audit-log-adapter.ts
    terms-version/env-terms-version-adapter.ts
    hooks/sign-up.hooks.ts
    hooks/sign-in.hooks.ts
    hooks/sign-out.hooks.ts
    hooks/google-oauth.hooks.ts
    i18n/messages.ts
    guards/admin-bearer.guard.ts
    rate-limit/signup-ip-rate-limit.middleware.ts
    redis/redis.module.ts
    redis/redis.constants.ts
  identity.module.ts
```

**Acceptance criteria:**
- [ ] All files exist (can be empty stubs with `export {}`
- [ ] `npx turbo typecheck --filter @repo/api` still exits 0

---

### Slice 3 — Domain Layer (T2)

**Source:** `apps/auth/src/domain/`  
**Destination:** `apps/api/src/modules/identity/domain/`

**Changes from source:**
- Rename all error codes: `AUTH_` → `IDENTITY_` prefix
- Keep domain pure: no NestJS decorators, no Better Auth imports
- All classes immutable (no mutation — spread/map/filter)

**Files to migrate (1:1 adaptation):**

| Source | Destination | Change |
|---|---|---|
| `domain/events/domain-event.ts` | `domain/events/domain-event.ts` | None |
| `domain/entities/user.entity.ts` | `domain/entities/user.entity.ts` | None |
| `domain/value-objects/password.value-object.ts` | `domain/value-objects/password.value-object.ts` | None |
| `domain/value-objects/user.value-object.ts` | `domain/value-objects/user.value-object.ts` | None |
| `domain/exceptions/invalid-credentials.exception.ts` | `domain/exceptions/invalid-credentials.exception.ts` | Code: `AUTH_INVALID_CREDENTIALS` → `IDENTITY_INVALID_CREDENTIALS` |
| `domain/exceptions/invalid-password.exception.ts` | `domain/exceptions/invalid-password.exception.ts` | Code: `AUTH_INVALID_PASSWORD` → `IDENTITY_INVALID_PASSWORD` |
| `domain/exceptions/no-password-account.exception.ts` | `domain/exceptions/no-password-account.exception.ts` | Code: `AUTH_NO_PASSWORD_ACCOUNT` → `IDENTITY_NO_PASSWORD_ACCOUNT` |
| `domain/exceptions/password-reuse.exception.ts` | `domain/exceptions/password-reuse.exception.ts` | Code: `AUTH_PASSWORD_REUSE` → `IDENTITY_PASSWORD_REUSE` |

**Acceptance criteria:**
- [ ] No imports from NestJS, Better Auth, or infrastructure in domain files
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

---

### Slice 4 — Application Layer (T3)

**Source:** `apps/auth/src/application/`  
**Destination:** `apps/api/src/modules/identity/application/`

**Files to migrate:**

| Source | Destination | Change |
|---|---|---|
| `application/ports/in/change-password.use-case.port.ts` | `application/ports/in/change-password.use-case.port.ts` | None |
| `application/ports/out/*.port.ts` (all 9 ports) | `application/ports/out/*.port.ts` | None |
| `application/use-cases/change-password.use-case.ts` | `application/use-cases/change-password.use-case.ts` | Update error code imports if any |

**Acceptance criteria:**
- [ ] Ports reference only domain types (no framework imports)
- [ ] Use case injects only via port interfaces
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

---

### Slice 5 — Infrastructure Layer (T4a–T4d)

These four sub-tasks are independent and can be implemented in parallel.

#### T4a — Drizzle Schemas (11 tables)

**Source:** `apps/auth/src/infrastructure/database/schema/`  
**Destination:** `apps/api/src/modules/identity/infrastructure/persistence/schema/`

**Note:** The API's `drizzle.config.ts` already globs `src/modules/**/infrastructure/persistence/*.schema.ts` — new schemas are auto-discovered. No config change needed.

**Critical change:** Remove `AUTH_DATABASE_URL` references; schemas connect via the shared `DRIZZLE_CLIENT` (same `DATABASE_URL` as the rest of the API). No schema content changes needed.

**Files (1:1 copy, no functional changes):**
- `user.schema.ts`, `session.schema.ts`, `account.schema.ts`, `verification.schema.ts`
- `password-history.schema.ts`, `two-factor.schema.ts`, `device.schema.ts`
- `login-audit-log.schema.ts`, `signup-audit-log.schema.ts`, `jwks.schema.ts`
- `rate-limit.schema.ts`

**Extra file to create:** `email-change-verification.schema.ts` (referenced in SPEC but not in apps/auth — may need to be authored or confirmed with user)

**Acceptance criteria:**
- [ ] All 12 schema files exist and compile
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

#### T4b — Drizzle Repository Adapters (4 adapters)

**Source:** `apps/auth/src/infrastructure/database/repositories/`  
**Destination:** `apps/api/src/modules/identity/infrastructure/persistence/repositories/`

**Critical change:** Replace `@Inject(AUTH_DRIZZLE_CLIENT)` (or whatever the auth service uses) with `@Inject(DRIZZLE_CLIENT)` from `@/infrastructure/database/drizzle.module`. The `DRIZZLE_CLIENT` symbol is already global in `apps/api`.

**Files:** `drizzle-user-repository.adapter.ts`, `drizzle-account-repository.adapter.ts`, `drizzle-session-repository.adapter.ts`, `drizzle-password-history-repository.adapter.ts`

**Acceptance criteria:**
- [ ] Each adapter injects `DRIZZLE_CLIENT` (not `AUTH_DRIZZLE_CLIENT`)
- [ ] Each adapter implements the matching outbound port interface
- [ ] No raw SQL — Drizzle ORM only
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

#### T4c — Better Auth Singleton + Hooks

**Source:** `apps/auth/src/infrastructure/better-auth/auth.ts` + `hooks/`  
**Destination:** `apps/api/src/modules/identity/infrastructure/better-auth/auth.ts` + `hooks/`

**Critical changes:**
- `basePath` stays `/api/v1/auth`
- Database: use the API's Drizzle connection (same `DATABASE_URL`) — remove the separate pool
- Install missing packages in `apps/api`: `better-auth`, `@better-auth/drizzle-adapter`, `@thallesp/nestjs-better-auth`, `argon2`, `ioredis`, `nodemailer`
- The auth singleton needs access to the shared Drizzle client — wire through the module rather than creating a second pool

**Files:** `auth.ts`, `sign-up.hooks.ts`, `sign-in.hooks.ts`, `sign-out.hooks.ts`, `google-oauth.hooks.ts`

**Acceptance criteria:**
- [ ] Better Auth singleton compiles with no `any`
- [ ] All hook files import from identity domain only (no cross-module)
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

#### T4d — Side Adapters

**Source:** Various `apps/auth/src/infrastructure/` subdirectories  
**Destination:** Matching subdirectories in `apps/api/src/modules/identity/infrastructure/`

**Files to migrate (1:1 with local import fixes):**

| Source dir | Destination dir | Notes |
|---|---|---|
| `infrastructure/hash/` | `infrastructure/hash/` | `argon2-hash-adapter.ts` |
| `infrastructure/email/` | `infrastructure/email/` | `smtp-email-adapter.ts` (nodemailer) |
| `infrastructure/captcha/` | `infrastructure/captcha/` | `google-captcha-adapter.ts` |
| `infrastructure/token/` | `infrastructure/token/` | `hmac-token-adapter.ts` |
| `infrastructure/audit-log/` | `infrastructure/audit-log/` | `drizzle-audit-log-adapter.ts` |
| `infrastructure/terms-version/` | `infrastructure/terms-version/` | `env-terms-version-adapter.ts` |
| `infrastructure/redis/` | `infrastructure/redis/` | `redis.module.ts`, `redis.constants.ts` |
| `infrastructure/guards/` | `infrastructure/guards/` | `admin-bearer.guard.ts` |
| `infrastructure/rate-limit/` | `infrastructure/rate-limit/` | `signup-ip-rate-limit.middleware.ts` |
| `infrastructure/swagger/` → `web/` | `infrastructure/web/` | `better-auth-docs.module.ts` + `better-auth-virtual.controller.ts` |
| `infrastructure/i18n/` | `infrastructure/i18n/` | `messages.ts` — update error code strings to `IDENTITY_*` |
| `infrastructure/http/` → `web/` | `infrastructure/web/` | `change-password.controller.ts` |

**Acceptance criteria:**
- [ ] All adapters implement their matching outbound port
- [ ] No `console.log`, no `any`, no cross-module imports
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

---

### Slice 6 — Module Wiring (T5)

**Goal:** `identity.module.ts` wires all providers + controller; `app.module.ts` imports it.

**identity.module.ts providers to register:**
- `DrizzleUserRepositoryAdapter` (token: `USER_REPOSITORY_PORT`)
- `DrizzleAccountRepositoryAdapter` (token: `ACCOUNT_REPOSITORY_PORT`)
- `DrizzleSessionRepositoryAdapter` (token: `SESSION_REPOSITORY_PORT`)
- `DrizzlePasswordHistoryRepositoryAdapter` (token: `PASSWORD_HISTORY_REPOSITORY_PORT`)
- `Argon2HashAdapter` (token: `PASSWORD_HASH_SERVICE_PORT`)
- `SmtpEmailAdapter` (token: `EMAIL_SERVICE_PORT`)
- `GoogleCaptchaAdapter` (token: `CAPTCHA_SERVICE_PORT`)
- `HmacTokenAdapter` (token: `TOKEN_SERVICE_PORT`)
- `DrizzleAuditLogAdapter` (token: `AUDIT_LOG_SERVICE_PORT`)
- `EnvTermsVersionAdapter` (token: `TERMS_VERSION_SERVICE_PORT`)
- `ChangePasswordUseCase`
- `RedisModule` (if REDIS_URL is set, optional)
- `BetterAuthDocsModule` (non-production only)

**Controllers:** `ChangePasswordController`, `BetterAuthVirtualController`

**Middleware in identity.module.ts:**
- `SignupIpRateLimitMiddleware` on `POST /api/v1/auth/sign-up/email`
- Body parser exclusion on `/api/v1/auth/(.*)` routes

**app.module.ts change:** add `IdentityModule` to imports array.

**Acceptance criteria:**
- [ ] `identity.module.ts` exports nothing (self-contained)
- [ ] `app.module.ts` imports `IdentityModule`
- [ ] `npx turbo typecheck --filter @repo/api` exits 0

---

### Slice 7 — Env Vars + Bootstrap (T6)

**Goal:** API validates all required env vars at startup; body-parser split applied correctly.

**New file:** `apps/api/src/env.ts`
- Validate all vars listed in SPEC §2 Phase 4
- Must exist before `NestFactory.create()` is called in `main.ts`

**JWT guard rewrite (new task, part of T6):**

The existing `jwt-auth.guard.ts` fetches JWKS from an external URL. After migration there is no external JWKS endpoint — Better Auth now issues access tokens that are decoded directly.

- Replace the JWKS-based verification with a standard JWT decode using the **RS256 public key** (`AUTH_PUBLIC_KEY` env var)
- Remove `AUTH_JWKS_URL` from required env; remove `AUTH_ISSUER` and `AUTH_AUDIENCE` unless still needed for audience/issuer claim validation (check existing guard logic)
- Use `jsonwebtoken` (`jwt`) to verify the token with the public key — install in `apps/api` if not already present

**main.ts changes:**
1. Import `./env` at top (side-effect import for validation)
2. Change `NestFactory.create()` to `bodyParser: false`
3. Add selective JSON middleware (applies to all routes EXCEPT `/api/v1/auth/*`)
4. Remove `AUTH_JWKS_URL` from env; update guard to decode via `AUTH_PUBLIC_KEY`
5. CORS trusted origins: `CLIENT_URL` and `ADMIN_URL` env vars (replaces `ORCHESTRATOR_URL`)

**Acceptance criteria:**
- [ ] `env.ts` validates all required vars and throws at startup if missing
- [ ] Better Auth routes receive raw body; all other routes receive parsed body
- [ ] `npx turbo typecheck --filter @repo/api` exits 0
- [ ] `npx turbo lint --filter @repo/api` exits 0

> **CHECKPOINT A** — Both commands above must pass before proceeding to tests.

---

### Slice 8 — Tests (T7)

**Goal:** ≥80% coverage on the identity module.

**Test files (colocated `.spec.ts`, NOT in a separate `test/` dir):**

```
domain/value-objects/password.value-object.spec.ts
domain/value-objects/user.value-object.spec.ts
domain/entities/user.entity.spec.ts
application/use-cases/change-password.use-case.spec.ts
infrastructure/persistence/repositories/drizzle-user-repository.adapter.spec.ts
infrastructure/hash/argon2-hash-adapter.spec.ts
infrastructure/web/change-password.controller.spec.ts
```

**Test approach (per SPEC §5):**
- Domain / use case: `vi.fn()` mocks for ports, no NestJS
- Controller: `@nestjs/testing` `Test.createTestingModule()`
- Drizzle adapters: real test database (`DATABASE_URL` pointing to test DB)
- Better Auth hooks: mock the Better Auth context object

**Acceptance criteria:**
- [ ] `npm -C apps/api test` exits 0
- [ ] `npm -C apps/api test:coverage` reports ≥80% for `src/modules/identity/`

> **CHECKPOINT B** — Coverage report must show ≥80% before deletion of apps/auth.

---

### Slice 9 — Cleanup (T8)

**Goal:** Remove `apps/auth` and all references to it.

**Steps:**
1. `git rm -r apps/auth`
2. Remove `apps/auth` from `package.json` workspaces array
3. Remove `apps/auth` pipeline entries from `turbo.json` (if any)
4. Update any CI configuration referencing `apps/auth`
5. Remove `@repo/swagger` from `apps/api/package.json` (if still present)
6. Run `npm install` to sync lockfile

**Acceptance criteria:**
- [ ] `apps/auth/` directory does not exist
- [ ] `npx turbo typecheck` (full monorepo, no filter) exits 0
- [ ] `npx turbo lint` (full monorepo) exits 0

> **CHECKPOINT C** — Full monorepo must be clean before this plan is complete.

---

## Confirmed Decisions

| # | Question | Answer |
|---|---|---|
| Q1 | `email-change-verification.schema.ts` needed? | **Yes — include in T4a** |
| Q2 | JWT guard strategy after migration? | **Decode RS256 access token directly via `AUTH_PUBLIC_KEY` using `jsonwebtoken`; no JWKS fetch; remove `AUTH_JWKS_URL`** |
| Q3 | Better Auth DB pool | **Reuse Drizzle module's existing `pg.Pool` — pass it into Better Auth's Drizzle adapter** |
| Q4 | CORS trusted origins | **`CLIENT_URL` and `ADMIN_URL` env vars — two distinct origins** |
| Q5 | Redis startup behavior | **Silent fallback to in-memory; never crash on missing/unreachable `REDIS_URL`** |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| `@repo/swagger` replacement breaks Swagger UI generation | Medium | Audit all `@repo/swagger` import sites in apps/api before removing |
| Drizzle schema table name collisions (auth tables vs existing API tables) | Low | Review all 11 schema files for table name conflicts before T4a |
| `CLIENT_URL` / `ADMIN_URL` vars not yet in API env | Medium | Add to `env.ts`; remove `ORCHESTRATOR_URL` / old `CORS` references from main.ts |
| Better Auth needs direct `pg.Pool` reference, not just `NodePgDatabase` | Medium | Check Better Auth Drizzle adapter API — may accept either; confirm in T4c |
