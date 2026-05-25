# Implementation Plan: Auth, RBAC & Support Modules — Template Integration

## Overview

Transform copied Zoom-specific code in `apps/api/src/modules/` and `packages/` into a clean,
portable NestJS template implementation. The work removes multi-sistema, organizations, system
API keys, SMS, and all `@zoom/*` references, replacing them with a RBAC-first auth stack built
on better-auth, Postmark, Sentry, and `@repo/*` packages.

**Spec:** `docs/auth/spec.md`  
**Branch:** `auth-integration-template`

---

## Current State Assessment

| Area | State |
|---|---|
| `packages/utils` | Named `@zoom/utils` — exports already complete (DomainException, LOGGER_PORT, IStructuredLogger, i18n) |
| `packages/schemas/src/swagger` | Named `@zoom/swagger` — exports complete |
| `packages/schemas` | Named `@repo/schemas` ✅ — missing `export * from './http'` in index |
| Auth module (new Zoom files) | Untracked — 216+ files with `@zoom/*` imports |
| Zoom-specific infra | Still present: `sms/`, `zoom/`, `system-key/`, system guards/schemas/use-cases |
| Dependencies | `better-auth`, `postmark`, `@sentry/nestjs`, `ioredis` not yet installed |
| `AppModule` | Old minimal version — needs full rewrite |
| `main.ts` | Old version — no `instrument.ts`, no proper middleware |
| Shared guards | `src/shared/guards/` dir exists — standard guards not yet created |
| RbacModule | Does not exist yet |

---

## Architecture Decisions

- **better-auth** owns the auth protocol (sign-up/in/out, 2FA, OAuth, session, JWK). NestJS wraps it via hooks and guards — no custom JWT generation logic in the app layer.
- **RBAC is a separate module** (`src/modules/rbac/`). Zoom's `PermissionResolver` and `role_template` permission catalog are unrelated — they stay in `profiles/` and `role-templates/` respectively.
- **Package rename strategy:** rename `package.json` names first, then do a single global search-replace. This avoids partial states where some files use old names.
- **Deletion before adaptation:** delete Zoom-specific files before adapting the remaining ones. This surfaces real compile errors instead of hiding them behind dead imports.
- **`instrument.ts` must be the first import in `main.ts`** — Sentry requires this for full trace capture.

---

## Dependency Graph

```
packages/utils (rename → @repo/utils)
    │
    ├─ packages/schemas (add http export)
    │       └─ @repo/swagger (rename → @repo/swagger)
    │
    └─ apps/api
            ├─ Phase 0 ── Package renames + global @zoom→@repo replace
            │
            ├─ Phase 1 ── Install deps + delete Zoom-specific files
            │
            ├─ Phase 2 ── Adapt auth core (auth.ts, email, db-schema, guards)
            │
            ├─ Phase 3 ── Shared guards + RbacModule
            │
            ├─ Phase 4 ── users/ + profiles/ + role-templates/ cleanup
            │
            ├─ Phase 5 ── AppModule wiring + main.ts
            │
            ├─ Phase 6 ── Tests
            │
            └─ Phase 7 ── Dead code purge
```

---

## Task List

### Phase 0 — Packages (unblocks everything)

> These changes affect compilation of every module. Must land first.

---

#### Task 0.1: Rename `@zoom/utils` → `@repo/utils`

**Description:** Update `packages/utils/package.json` `name` field and the `devDependencies`
reference `@zoom/typescript-config` → `@repo/typescript-config`. The exports themselves are
already complete (DomainException, LOGGER_PORT, IStructuredLogger, i18n helpers).

**Acceptance criteria:**
- [ ] `packages/utils/package.json` `"name"` is `"@repo/utils"`
- [ ] `@zoom/typescript-config` reference replaced with `@repo/typescript-config`
- [ ] `npx turbo build --filter @repo/utils` succeeds

**Verification:**
- [ ] `grep -r "@zoom/utils" packages/utils/` returns no matches
- [ ] `npx turbo typecheck --filter @repo/utils` passes

**Dependencies:** None

**Files:**
- `packages/utils/package.json`
- `packages/utils/tsconfig.json` (if it references `@zoom/typescript-config`)

**Scope:** XS

---

#### Task 0.2: Rename `@zoom/swagger` → `@repo/swagger`

**Description:** Update `packages/schemas/src/swagger/package.json` `name` field and replace
`@zoom/typescript-config` with `@repo/typescript-config` in its tsconfig and devDependencies.

**Acceptance criteria:**
- [ ] `packages/schemas/src/swagger/package.json` `"name"` is `"@repo/swagger"`
- [ ] `npx turbo build --filter @repo/swagger` succeeds

**Verification:**
- [ ] `grep -r "@zoom/swagger" packages/` returns no matches
- [ ] `npx turbo typecheck --filter @repo/swagger` passes

**Dependencies:** None

**Files:**
- `packages/schemas/src/swagger/package.json`
- `packages/schemas/src/swagger/tsconfig.json`

**Scope:** XS

---

#### Task 0.3: Export `ApiResponse<T>` from `@repo/schemas`

**Description:** Add `export * from './http'` to `packages/schemas/src/index.ts` so
`ApiResponse<T>` and `apiResponseSchema` are accessible at the package root.

**Acceptance criteria:**
- [ ] `import { ApiResponse } from '@repo/schemas'` resolves without error
- [ ] `apiResponseSchema` is importable from `@repo/schemas`

**Verification:**
- [ ] `npx turbo typecheck --filter @repo/schemas` passes

**Dependencies:** None

**Files:**
- `packages/schemas/src/index.ts`

**Scope:** XS

---

#### Task 0.4: Global `@zoom/*` → `@repo/*` search-replace

**Description:** After Tasks 0.1–0.3, run a repo-wide search-replace across all `.ts` and
`.json` files:

| From | To |
|---|---|
| `@zoom/utils` | `@repo/utils` |
| `@zoom/swagger` | `@repo/swagger` |
| `@zoom/schemas` | `@repo/schemas` |
| `@zoom/typescript-config` | `@repo/typescript-config` |

**Acceptance criteria:**
- [ ] `grep -r "@zoom/" apps/ packages/ --include="*.ts" --include="*.json"` returns zero matches
- [ ] `npx turbo typecheck` on packages passes after replace

**Verification:**
- [ ] Zero `@zoom/*` references remain in the repo
- [ ] `npx turbo build` on packages succeeds

**Dependencies:** 0.1, 0.2, 0.3

**Files:** Many — sed/replace operation across monorepo

**Scope:** S (mechanical, but touches many files)

---

### Checkpoint 0 — Packages clean

- [ ] `npx turbo typecheck --filter @repo/utils --filter @repo/schemas --filter @repo/swagger` passes
- [ ] Zero `@zoom/*` import references anywhere in the repo
- [ ] Human review before proceeding

---

### Phase 1 — Auth: delete Zoom-specific files

> Remove everything that cannot exist in the template before touching what stays.
> Deletion first prevents "adapted" files from accidentally importing removed symbols.

---

#### Task 1.1: Install new API dependencies

**Description:** Install the following in `apps/api`:

```bash
npm install better-auth @thallesp/nestjs-better-auth ioredis postmark \
            @sentry/nestjs @sentry/node
```

Verify `argon2` version is compatible with chosen `better-auth` version.

**Acceptance criteria:**
- [ ] `apps/api/package.json` contains all five packages
- [ ] `npm install` from repo root succeeds (lockfile updated)
- [ ] `npx turbo build --filter @app/api` does not fail on missing module

**Verification:**
- [ ] `node -e "require('better-auth')"` in `apps/api/` succeeds
- [ ] `node -e "require('@sentry/nestjs')"` succeeds

**Dependencies:** None (can run alongside 0.x but after 0.4 for clean lockfile)

**Files:**
- `apps/api/package.json`
- Root `package-lock.json`

**Scope:** S

---

#### Task 1.2: Delete Zoom-specific infrastructure directories/files

**Description:** Remove files listed in spec §5.3. Concretely:

| Directory/File | Reason |
|---|---|
| `infrastructure/sms/zoom-sms.adapter.ts` | SMS Zoom-specific |
| `infrastructure/zoom/zoom-auth.service.ts` | Auth Zoom-specific |
| `infrastructure/hash/hmac-api-key-hash.adapter.ts` | System API keys |
| `infrastructure/system-key/` (3 files) | System API keys |
| `infrastructure/better-auth/better-auth-org.adapter.ts` | Organizations |
| `infrastructure/redis/redis-oauth-system-context-store.adapter.ts` | Multi-sistema |
| `infrastructure/hooks/phone-number-send-otp.hook.ts` | SMS |
| `infrastructure/guards/internal-service.guard.ts` | Multi-sistema |
| `infrastructure/guards/platform-admin.guard.ts` | Multi-sistema |
| `infrastructure/guards/system-admin.guard.ts` | Multi-sistema |
| `infrastructure/http/system-members.controller.ts` | Multi-sistema |
| `infrastructure/http/systems.controller.ts` | Multi-sistema |
| `infrastructure/http/terms.controller.ts` | Multi-sistema |
| `infrastructure/http/users-internal.controller.ts` | Multi-sistema |

**Acceptance criteria:**
- [ ] None of the listed files exist in the filesystem
- [ ] No remaining file imports from the deleted paths

**Verification:**
- [ ] `ls apps/api/src/modules/auth/infrastructure/sms/` → not found
- [ ] `ls apps/api/src/modules/auth/infrastructure/system-key/` → not found
- [ ] `grep -r "zoom-auth.service\|zoom-sms\|hmac-api-key" apps/api/src/` → zero matches

**Dependencies:** 0.4

**Files:** ~15 deleted files

**Scope:** S

---

#### Task 1.3: Delete Zoom-specific DB schemas

**Description:** Remove database schema files for multi-sistema tables (spec §5.3):

`system.schema.ts`, `system-api-key.schema.ts`, `system-membership.schema.ts`,
`system-terms.schema.ts`, `organization.schema.ts`, `member.schema.ts`,
`invitation.schema.ts`, `user-terms-acceptance.schema.ts`

**Acceptance criteria:**
- [ ] None of the listed schema files exist
- [ ] `infrastructure/database/db-schema.ts` no longer exports from deleted schemas

**Verification:**
- [ ] `ls apps/api/src/modules/auth/infrastructure/database/schema/` does not contain any system/org/terms schemas
- [ ] `grep -r "system\.schema\|organization\.schema\|invitation\.schema" apps/api/src/` → zero matches

**Dependencies:** 1.2

**Files:** 8 deleted files + `db-schema.ts` update

**Scope:** S

---

#### Task 1.4: Delete Zoom-specific use cases and ports

**Description:** Remove use cases and their corresponding `in/` + `out/` ports (spec §5.3):

Use cases: `accept-terms`, `deactivate-system`, `grant-system-access`, `list-system-members`,
`list-systems`, `provision-user`, `register-system`, `revoke-system-access`, `rotate-system-key`,
`update-member-role`, `update-system`

Ports out: `api-key-hash.port.ts`, `better-auth-org.port.ts`, `grant-access-unit-of-work.port.ts`,
`oauth-system-context-store.port.ts`, `pending-terms-store.port.ts`, `sms-service.port.ts`,
`system-audit-log.port.ts`, `system-key-service.port.ts`, `system-membership-repository.port.ts`,
`system-repository.port.ts`, `terms-repository.port.ts`, `user-terms-acceptance-repository.port.ts`

Domain entities: `system.entity.ts`, `system-api-key.entity.ts`, `system-membership.entity.ts`

**Acceptance criteria:**
- [ ] All listed use cases, ports, and domain entities are deleted
- [ ] No remaining file imports from deleted paths

**Verification:**
- [ ] `ls apps/api/src/modules/auth/application/use-cases/` contains only the KEEP list from spec §5.1
- [ ] `grep -r "accept-terms\|deactivate-system\|grant-system-access" apps/api/src/` → zero matches

**Dependencies:** 1.3

**Files:** ~25 deleted files

**Scope:** M

---

### Checkpoint 1 — Zoom artifacts removed

- [ ] `grep -r "@zoom/" apps/api/src/` → zero matches
- [ ] No system/org/terms/SMS files remain
- [ ] Human review: confirm nothing useful was accidentally deleted

---

### Phase 2 — Auth core adaptation

> Adapt what survives: auth.ts, email, db-schema, swagger docs, guards.

---

#### Task 2.1: Create `postmark-email.adapter.ts`

**Description:** Create `apps/api/src/modules/auth/infrastructure/email/postmark-email.adapter.ts`
implementing `EmailServicePort` (spec §6) using the Postmark SDK. Replace the wiring of
`zoom-email.adapter.ts` with this new adapter in `auth.module.ts`.

```typescript
// EmailServicePort interface (already exists in ports/out/email-service.port.ts)
abstract sendVerification(to: string, url: string): Promise<void>
abstract sendPasswordReset(to: string, url: string): Promise<void>
abstract send2faOtp(to: string, otp: string): Promise<void>
abstract sendSecurityAlert(to: string, event: string): Promise<void>
```

**Acceptance criteria:**
- [ ] `postmark-email.adapter.ts` implements all four methods of `EmailServicePort`
- [ ] Uses `POSTMARK_SERVER_TOKEN` from env
- [ ] `zoom-email.adapter.ts` is deleted (or replaced)
- [ ] Auth module binds `EmailServicePort` → `PostmarkEmailAdapter`

**Verification:**
- [ ] `npx turbo typecheck --filter @app/api` passes
- [ ] No remaining references to `zoom-email.adapter`

**Dependencies:** 1.4

**Files:**
- `apps/api/src/modules/auth/infrastructure/email/postmark-email.adapter.ts` (new)
- `apps/api/src/modules/auth/infrastructure/email/zoom-email.adapter.ts` (delete)
- `apps/api/src/modules/auth/auth.module.ts` (update binding)

**Scope:** S

---

#### Task 2.2: Adapt `auth.ts` — remove multi-sistema plugins

**Description:** Edit `apps/api/src/modules/auth/infrastructure/better-auth/auth.ts`:
- Remove `organization()` plugin import and registration
- Remove `OAuthSystemContextStore` injection and usage
- Remove `systemId` from all hook callbacks
- Keep all other plugins (2FA, email verification, email OTP, passkey, social OAuth)

**Acceptance criteria:**
- [ ] No `organization` plugin in `auth.ts`
- [ ] No `OAuthSystemContextStore` references
- [ ] No `systemId` parameter anywhere in the file
- [ ] `auth.ts` compiles without errors

**Verification:**
- [ ] `grep -n "organization\|OAuthSystem\|systemId" apps/api/src/modules/auth/infrastructure/better-auth/auth.ts` → zero matches
- [ ] `npx turbo typecheck --filter @app/api` passes

**Dependencies:** 2.1

**Files:**
- `apps/api/src/modules/auth/infrastructure/better-auth/auth.ts`

**Scope:** M

---

#### Task 2.3: Create `instrument.ts` + update `env.ts`

**Description:**

1. Create `apps/api/src/instrument.ts` — Sentry initialization as the very first import:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
});
```

2. Replace `apps/api/src/env.ts` with the clean Zod schema from spec §10 (remove
   `ORCHESTRATOR_URL`, `ZOOM_*`, and all multi-sistema variables).

**Acceptance criteria:**
- [ ] `apps/api/src/instrument.ts` exists and calls `Sentry.init`
- [ ] `env.ts` schema matches spec §10 exactly — no Zoom/multi-sistema variables
- [ ] `npx turbo typecheck --filter @app/api` passes after env.ts change

**Verification:**
- [ ] `grep -n "ORCHESTRATOR_URL\|ZOOM_" apps/api/src/env.ts` → zero matches
- [ ] All env vars in spec §10 are declared in the schema

**Dependencies:** 1.1

**Files:**
- `apps/api/src/instrument.ts` (new)
- `apps/api/src/env.ts`

**Scope:** S

---

#### Task 2.4: Adapt `admin-bearer.guard.ts` + `session.guard.ts`

**Description:**
- `admin-bearer.guard.ts`: Change check from multi-sistema admin role to `super_admin` role
- `session.guard.ts`: Remove all references to `sistema/org` context in session validation

**Acceptance criteria:**
- [ ] `admin-bearer.guard.ts` checks for `super_admin` role only
- [ ] `session.guard.ts` has no org/system references
- [ ] Both guards compile cleanly

**Verification:**
- [ ] `grep -n "sistema\|org\|system" apps/api/src/modules/auth/infrastructure/guards/admin-bearer.guard.ts` → zero matches
- [ ] `npx turbo typecheck --filter @app/api` passes

**Dependencies:** 2.2

**Files:**
- `apps/api/src/modules/auth/infrastructure/guards/admin-bearer.guard.ts`
- `apps/api/src/modules/auth/infrastructure/guards/session.guard.ts`

**Scope:** S

---

#### Task 2.5: Adapt Swagger docs module

**Description:** Edit `infrastructure/swagger/better-auth-docs.module.ts` and
`better-auth-virtual.controller.ts`:
- Remove `x-system-key` header from all operations
- Simplify `servers` array to `[{ url: env.API_BASE_URL }]`

**Acceptance criteria:**
- [ ] No `x-system-key` in Swagger docs output
- [ ] Single server entry pointing to `API_BASE_URL`

**Verification:**
- [ ] `grep -n "x-system-key\|systemKey" apps/api/src/modules/auth/infrastructure/swagger/` → zero matches

**Dependencies:** 2.3

**Files:**
- `apps/api/src/modules/auth/infrastructure/swagger/better-auth-docs.module.ts`
- `apps/api/src/modules/auth/infrastructure/swagger/better-auth-virtual.controller.ts`

**Scope:** S

---

### Checkpoint 2 — Auth core compiles

- [ ] `npx turbo typecheck --filter @app/api` passes (auth module only errors acceptable at this stage if they're from missing RbacModule/shared guards)
- [ ] No Zoom email, org plugin, or system-key references in auth module
- [ ] Human review before proceeding to RBAC

---

### Phase 3 — Shared guards + RbacModule

---

#### Task 3.1: Create shared guards and decorators

**Description:** Create the following in `apps/api/src/shared/guards/`:

| File | Purpose |
|---|---|
| `jwt-auth.guard.ts` | Global guard: validates cookie OR Bearer JWT via better-auth session |
| `permissions.guard.ts` | Global guard: reads `@RequirePermissions` metadata, calls `PermissionResolver` |
| `require-permissions.decorator.ts` | `@RequirePermissions({ permissions: string[], operator?: 'AND'\|'OR' })` |
| `current-permissions.decorator.ts` | `@CurrentPermissions()` — injects resolved `Set<string>` |
| `current-user.decorator.ts` | `@CurrentUser()` — injects `AuthUser` from request |
| `public.decorator.ts` | `@Public()` — marks route as unauthenticated |

`JwtAuthGuard` must check for `@Public()` decorator and skip validation if present.

**Acceptance criteria:**
- [ ] All six files created and compile
- [ ] `@Public()` routes bypass `JwtAuthGuard`
- [ ] `PermissionsGuard` resolves permissions and returns 403 on failure
- [ ] `@CurrentUser()` and `@CurrentPermissions()` inject from request context

**Verification:**
- [ ] `npx turbo typecheck --filter @app/api` passes
- [ ] Unit test: guard allows `@Public()` route without token
- [ ] Unit test: guard rejects request without valid session

**Dependencies:** 2.2 (needs auth.ts for session validation)

**Files:**
- `apps/api/src/shared/guards/jwt-auth.guard.ts` (new)
- `apps/api/src/shared/guards/permissions.guard.ts` (new)
- `apps/api/src/shared/guards/require-permissions.decorator.ts` (new)
- `apps/api/src/shared/guards/current-permissions.decorator.ts` (new)
- `apps/api/src/shared/guards/current-user.decorator.ts` (new)
- `apps/api/src/shared/guards/public.decorator.ts` (new)

**Scope:** M

---

#### Task 3.2: Create RbacModule

**Description:** Create `apps/api/src/modules/rbac/` with the structure from spec §7:

```
rbac/
├── rbac.module.ts
├── domain/
│   ├── role.entity.ts
│   └── permission.entity.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── role.schema.ts
│   │   ├── permission.schema.ts
│   │   ├── role-permission.schema.ts
│   │   └── user-role.schema.ts
│   └── drizzle-role.repository.ts
└── application/
    └── permission-resolver.service.ts
```

`PermissionResolver.resolve(userId: string): Promise<Set<string>>` — loads user's roles,
then loads each role's permissions, returns flat Set. `super_admin` short-circuits to `'*'`
sentinel that `PermissionsGuard` treats as "allow all".

**Acceptance criteria:**
- [ ] All files created and compile
- [ ] `PermissionResolver.resolve()` returns `Set<string>` for any userId
- [ ] `super_admin` users pass all permission checks
- [ ] `RbacModule` exports `PermissionResolver` for injection into `PermissionsGuard`

**Verification:**
- [ ] `npx turbo typecheck --filter @app/api` passes
- [ ] Unit test: `PermissionResolver` resolves correct permissions for a role
- [ ] Unit test: `super_admin` returns wildcard / bypasses all checks

**Dependencies:** 3.1

**Files:**
- `apps/api/src/modules/rbac/` (7 new files)

**Scope:** M

---

#### Task 3.3: RBAC database migration + seed

**Description:** Create Drizzle migration adding the four RBAC tables (`role`, `permission`,
`role_permission`, `user_role`) and a seed file that inserts:

| Slug | `is_system` |
|---|---|
| `super_admin` | true |
| `admin` | true |
| `viewer` | false |

**Acceptance criteria:**
- [ ] Migration file created in `apps/api/drizzle/` (or migration dir)
- [ ] Seed script inserts the three roles idempotently (upsert on slug)
- [ ] `npx drizzle-kit push` (or migrate) succeeds against local DB

**Verification:**
- [ ] Tables `role`, `permission`, `role_permission`, `user_role` exist in DB after migration
- [ ] `SELECT slug FROM role` returns `super_admin`, `admin`, `viewer`

**Dependencies:** 3.2

**Files:**
- `apps/api/drizzle/<timestamp>_rbac.sql` (new)
- `apps/api/src/modules/rbac/infrastructure/persistence/seed.ts` (new)

**Scope:** M

---

### Checkpoint 3 — Guards + RBAC compiles and seeds

- [ ] `npx turbo typecheck --filter @app/api` passes
- [ ] `@RequirePermissions` + `PermissionsGuard` work end-to-end in isolation
- [ ] RBAC seed runs successfully
- [ ] Human review before adapting support modules

---

### Phase 4 — Support module cleanup

---

#### Task 4.1: Adapt `users/` module

**Description:**
- Fix all imports: `@zoom/*` → `@repo/*` (should be done after Phase 0, verify remaining)
- Replace `TCurrentUserResponse` with schema from `@repo/schemas`
- Replace `TProfileDetailResponse` with schema from `@repo/schemas`
- Update `users.module.ts` to reference `ProfilesModule`
- Replace `@CurrentUser` import with `src/shared/guards/current-user.decorator`
- Fix `@zoom/swagger` → `@repo/swagger` in controllers

**Acceptance criteria:**
- [ ] `GET /users/current` returns user without Zoom fields (`businessProfileId`, `coreClientStatus`, etc.)
- [ ] `npx turbo typecheck --filter @app/api` passes for users module

**Verification:**
- [ ] `grep -rn "@zoom/" apps/api/src/modules/users/` → zero matches
- [ ] `grep -rn "businessProfileId\|coreClientStatus" apps/api/src/modules/users/` → zero matches

**Dependencies:** 3.1 (needs `@CurrentUser` decorator)

**Files:**
- `apps/api/src/modules/users/users.module.ts`
- `apps/api/src/modules/users/application/use-cases/get-current-user.use-case.ts`
- `apps/api/src/modules/users/application/use-cases/get-profile-detail.use-case.ts`
- `apps/api/src/modules/users/infrastructure/http/users.controller.ts`
- `apps/api/src/modules/users/infrastructure/http/profile.controller.ts`
- `apps/api/src/modules/users/domain/exceptions/*.ts` (5 files)
- `apps/api/src/modules/users/infrastructure/i18n/messages.ts`

**Scope:** M

---

#### Task 4.2: Adapt `profiles/` module

**Description:**
- Delete `application/permission-resolver.service.ts` (Zoom shipping resolver — replaced by RbacModule)
- Delete `infrastructure/adapters/locker-reader.adapter.ts` (Zoom locker feature)
- Delete `infrastructure/http/profiles-internal.controller.ts` or remove `InternalServiceGuard` usage
- Delete `infrastructure/persistence/business-profile-billing-city-reader.adapter.ts` if it has Zoom external deps
- Fix all `@zoom/*` imports

**Acceptance criteria:**
- [ ] `GET /profile` returns profile without Zoom fields
- [ ] No reference to `invitations/` module or `resolved-permissions.type`
- [ ] `npx turbo typecheck --filter @app/api` passes for profiles module

**Verification:**
- [ ] `grep -rn "@zoom/\|locker-reader\|InternalServiceGuard" apps/api/src/modules/profiles/` → zero matches
- [ ] `grep -rn "invitations\|resolved-permissions" apps/api/src/modules/profiles/` → zero matches

**Dependencies:** 3.1

**Files:**
- `apps/api/src/modules/profiles/application/permission-resolver.service.ts` (delete)
- `apps/api/src/modules/profiles/infrastructure/adapters/locker-reader.adapter.ts` (delete)
- All remaining profiles files: fix imports

**Scope:** M

---

#### Task 4.3: Adapt `role-templates/` module

**Description:**
- Delete `infrastructure/persistence/business-profile-permission.schema.ts`
- Delete `infrastructure/persistence/business-profile-service.schema.ts`
- Delete `infrastructure/persistence/business-profile-service-recipient-whitelist.schema.ts`
- Fix import path of `roleTemplate` schema in `role-template-permission.schema.ts`
- Fix shipping enum imports in `role-template-service.schema.ts`
- Fix all `@zoom/*` imports in use cases, ports, controller, i18n

**Acceptance criteria:**
- [ ] `GET /role-templates` lists templates without business-profile references
- [ ] `npx turbo typecheck --filter @app/api` passes for role-templates module

**Verification:**
- [ ] `ls apps/api/src/modules/role-templates/infrastructure/persistence/` → no `business-profile-*` files
- [ ] `grep -rn "@zoom/" apps/api/src/modules/role-templates/` → zero matches

**Dependencies:** 0.4

**Files:**
- 3 deleted persistence schemas
- `role-template-permission.schema.ts` (import fix)
- `role-template-service.schema.ts` (import fix)
- All use cases, ports, controller, i18n files in role-templates

**Scope:** M

---

### Checkpoint 4 — All modules compile

- [ ] `npx turbo typecheck --filter @app/api` passes with zero errors
- [ ] Zero `@zoom/*` references anywhere in `apps/api/src/`
- [ ] Human review before final wiring

---

### Phase 5 — AppModule wiring + main.ts

---

#### Task 5.1: Rewrite `AppModule`

**Description:** Replace `apps/api/src/app.module.ts` with the wiring from spec §9:

```typescript
@Module({
  imports: [
    LoggerModule, DrizzleModule, RedisModule, BruteForceModule, HealthModule,
    ThrottlerModule.forRoot([{ ttl: env.RATE_TTL, limit: env.RATE_LIMIT }]),
    AuthModule.forRoot({ auth, bodyParser: { json: { enabled: true } } }),
    RbacModule, UsersModule, ProfilesModule, RoleTemplatesModule,
    ...(env.NODE_ENV !== 'production' ? [BetterAuthDocsModule] : []),
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SentryUserInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
```

Also configure `configure()` with:
- `sentryScopeMiddleware` → `forRoutes('*')`
- `SessionActivityMiddleware` → `forRoutes('*')` except `/api/v1/auth/*` and `/api/v1/public/*`

**Acceptance criteria:**
- [ ] `AppModule` matches spec §9 wiring exactly
- [ ] `npx turbo typecheck --filter @app/api` passes

**Verification:**
- [ ] `grep -n "BusModule\|SecurityModule\|UsersModule.*old" apps/api/src/app.module.ts` → zero matches (old modules gone)

**Dependencies:** 3.2, 4.1, 4.2, 4.3

**Files:**
- `apps/api/src/app.module.ts`

**Scope:** S

---

#### Task 5.2: Update `main.ts`

**Description:**
- Add `import './instrument'` as the very first line
- Remove `ORCHESTRATOR_URL` and any Zoom-specific middleware
- Register `CorrelationIdMiddleware` via `expressApp.use()` (before NestFactory)
- Update Fastify/Express setup to match spec §9 middleware order

**Acceptance criteria:**
- [ ] `instrument.ts` import is the first line in `main.ts`
- [ ] No `ORCHESTRATOR_URL` or Zoom references
- [ ] `CorrelationIdMiddleware` is registered

**Verification:**
- [ ] `head -1 apps/api/src/main.ts` outputs `import './instrument'`
- [ ] `grep -n "ORCHESTRATOR\|ZOOM" apps/api/src/main.ts` → zero matches
- [ ] App starts without errors (manual)

**Dependencies:** 2.3, 5.1

**Files:**
- `apps/api/src/main.ts`

**Scope:** S

---

### Checkpoint 5 — App boots

- [ ] `npx turbo typecheck` passes with zero errors across the entire repo
- [ ] App starts locally without errors (manual check — NOT a dev server in CI)
- [ ] `npx turbo lint` passes
- [ ] Human review before writing tests

---

### Phase 6 — Tests

---

#### Task 6.1: Unit tests — PermissionResolver + BruteForce + SignInHook

**Description:** Write unit tests for:
- `PermissionResolver.resolve()`: regular user gets correct permissions, `super_admin` bypasses all
- `BruteForce` service: 5 failed attempts → lock; unlock after TTL
- `sign-in.hooks.ts`: validates captcha before sign-in, records audit log after

**Acceptance criteria:**
- [ ] `PermissionResolver` unit tests pass (mock Drizzle)
- [ ] BruteForce unit tests pass (mock Redis)
- [ ] SignIn hook unit tests pass (mock captcha + audit log ports)

**Verification:**
- [ ] `npx turbo test --filter @app/api` passes

**Dependencies:** 3.2

**Files:**
- `apps/api/src/modules/rbac/application/permission-resolver.service.spec.ts` (new)
- `apps/api/src/modules/auth/infrastructure/brute-force/*.spec.ts` (new)
- `apps/api/src/modules/auth/infrastructure/hooks/sign-in.hooks.spec.ts` (new)

**Scope:** M

---

#### Task 6.2: Integration test — sign-up → verify → sign-in flow

**Description:** Write an integration test covering:
1. `POST /api/v1/auth/sign-up/email` → 200, email queued
2. Email verification URL → 200, account activated
3. `POST /api/v1/auth/sign-in/email` → 200, session cookie set
4. `POST /api/v1/auth/sign-out` → 200, cookie cleared

Uses a real test database (no mocks for DB layer).

**Acceptance criteria:**
- [ ] Full sign-up → verify → sign-in → sign-out flow test passes
- [ ] Test verifies unverified account cannot sign in (returns 4xx)

**Verification:**
- [ ] `npx turbo test --filter @app/api` passes

**Dependencies:** 5.1, 5.2

**Files:**
- `apps/api/test/auth-flow.e2e-spec.ts` (new)

**Scope:** M

---

#### Task 6.3: Guard tests

**Description:**
- `@Public()` decorated route passes without any token
- Protected route without token returns 401
- Protected route with `@RequirePermissions` and insufficient role returns 403

**Acceptance criteria:**
- [ ] All three guard scenarios covered by tests
- [ ] `npx turbo test --filter @app/api` passes

**Dependencies:** 3.1, 3.2

**Files:**
- `apps/api/test/guards.e2e-spec.ts` (new)

**Scope:** S

---

### Checkpoint 6 — Tests green

- [ ] `npx turbo test --filter @app/api` → all pass
- [ ] `npx turbo typecheck` → zero errors
- [ ] `npx turbo lint` → zero errors
- [ ] Human review before dead code purge

---

### Phase 7 — Dead code purge

---

#### Task 7.1: TypeScript dead code analysis

**Description:** Enable `noUnusedLocals: true` and `noUnusedParameters: true` in
`apps/api/tsconfig.json` (or check if already enabled). Run `npx turbo typecheck` and fix
all unused-symbol errors.

Additionally, search for orphaned files (not imported by any other module), unused Drizzle schemas,
ports without adapters, and env vars without consumers. Delete confirmed dead code.

**Acceptance criteria:**
- [ ] Zero unused-local TypeScript errors
- [ ] Zero Zoom-origin files remain (verify with grep)
- [ ] No env var in `env.ts` is unread by any file

**Verification:**
- [ ] `grep -rn "zoom\|Zoom" apps/api/src/ --include="*.ts"` → zero matches
- [ ] `npx turbo typecheck` passes with strict unused flags

**Dependencies:** 6.3

**Files:** Various (delete-only operation)

**Scope:** M

---

### Checkpoint 7 — Final

- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo lint` passes
- [ ] `npx turbo test --filter @app/api` passes
- [ ] `grep -rn "@zoom/" .` returns zero matches
- [ ] All spec §11 acceptance criteria checked off
- [ ] Ready for PR review

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `better-auth` version incompatible with existing `argon2` | High | Check peer deps before installing; pin argon2 if needed |
| Profiles module has undiscovered Zoom external HTTP calls | Medium | Audit `locker-reader.adapter.ts` and `billing-city-reader.adapter.ts` before deleting |
| DB migration conflicts with existing local dev data | Low | Use `drizzle-kit push` for dev; migration file for CI |
| Global search-replace corrupts non-`@zoom/*` strings | Low | Run replace with exact `from '@zoom/` prefix; review diff before committing |
| `users/` module depends on deleted profiles permissions resolver | Medium | Confirm all `profiles/PermissionResolver` usages in `users/` are removed in Task 4.1 |

---

## Open Questions

1. **`locker-reader.adapter.ts` in profiles/** — does it make any external HTTP calls to Zoom infra, or is it purely internal logic? If external, delete; if internal logic reused elsewhere, stub.
2. **`business-profile-billing-city-reader.adapter.ts`** — same question. Depends on external GCP/Zoom service?
3. **Fastify vs Express** — current `main.ts` uses Express patterns. Does `@thallesp/nestjs-better-auth` require a specific adapter?
4. **Social OAuth for template** — keep Google OAuth enabled by default (`GOOGLE_ENABLED=false`) or remove plugin registration entirely?
