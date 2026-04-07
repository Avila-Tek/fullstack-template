# SPEC: Identity Module Migration into API

**Status:** Draft — pending user confirmation  
**Date:** 2026-04-07  
**Author:** Claude (Sonnet 4.6)

---

## 1. Objective

Merge `apps/auth` (a standalone Better Auth microservice) into `apps/api` as a first-class NestJS feature module called `identity`. The result is a single deployable API that owns authentication, identity management, and all business logic. After migration, `apps/auth` is deleted from the repository.

**Success criteria:**
- `npx turbo typecheck --filter @repo/api` passes with zero errors
- `npx turbo lint --filter @repo/api` passes with zero warnings
- `npm -C apps/api test` passes with ≥80% coverage on the identity module
- All auth features from `apps/auth` are present and working in `apps/api`
- No cross-module imports (identity module is self-contained)
- `apps/auth` directory is removed from the repository

---

## 2. Scope of Work

### Phase 0 — Fix existing API errors (pre-migration)

The current `apps/api` has ~60 TypeScript errors from missing packages and missing exports in `@repo/utils` / `@repo/schemas`. These must be resolved before adding the identity module.

**Categories of errors:**
| Category | Root Cause |
|---|---|
| `@repo/swagger` not found | Package was removed or never published |
| `@repo/utils` missing exports (`LOGGER_PORT`, `DomainException`, `httpMessages`, `IStructuredLogger`, `parseLocale`, `resolveMessage`, `redactPii`, `SupportedLocale`, `HttpErrorCode`) | Exports deleted or moved from the package |
| `@repo/schemas` missing exports (`ApiResponse`, `FieldError`) | Exports deleted or moved |
| `@sentry/nestjs` not found | Package not installed in `apps/api` |
| `nestjs-pino` not found | Package not installed |
| `@nestjs/terminus` not found | Package not installed |
| `@opentelemetry/*` packages not found | Packages not installed |
| `vitest`, `vite-tsconfig-paths` not found | Dev packages not installed |
| `pino` not found | Package not installed |

**Fix strategy:**
1. Install missing packages directly in `apps/api`
2. For missing `@repo/utils` / `@repo/schemas` exports: restore or inline them locally in `apps/api/src/shared/` (do not modify shared packages if their API has intentionally changed)
3. Remove `@repo/swagger` dependency and replace its usage with direct `@nestjs/swagger` calls

### Phase 1 — Identity module structure

Create `apps/api/src/modules/identity/` following the exact same hexagonal + DDD pattern mandated by `apps/api/CLAUDE.md`.

```
src/modules/identity/
  domain/
    entities/
      user.entity.ts                 # Immutable User aggregate
    value-objects/
      password.value-object.ts       # Password validation, strength rules
      user.value-object.ts           # Immutable user VO
    exceptions/
      invalid-credentials.exception.ts   # IDENTITY_INVALID_CREDENTIALS
      invalid-password.exception.ts      # IDENTITY_INVALID_PASSWORD
      no-password-account.exception.ts   # IDENTITY_NO_PASSWORD_ACCOUNT
      password-reuse.exception.ts        # IDENTITY_PASSWORD_REUSE
    events/
      domain-event.ts                # Base DomainEvent
  application/
    ports/in/
      change-password.use-case.port.ts
    ports/out/
      user-repository.port.ts
      account-repository.port.ts
      session-repository.port.ts
      password-history-repository.port.ts
      email-service.port.ts
      password-hash-service.port.ts
      token-service.port.ts
      audit-log-service.port.ts
      device-repository.port.ts
      captcha-service.port.ts
      terms-version-service.port.ts
    use-cases/
      change-password.use-case.ts
  infrastructure/
    better-auth/
      auth.ts                        # Better Auth singleton (moved from apps/auth)
    persistence/
      schema/
        user.schema.ts
        session.schema.ts
        account.schema.ts
        verification.schema.ts
        password-history.schema.ts
        two-factor.schema.ts
        device.schema.ts
        login-audit-log.schema.ts
        signup-audit-log.schema.ts
        jwks.schema.ts
        rate-limit.schema.ts
        email-change-verification.schema.ts
      repositories/
        drizzle-user-repository.adapter.ts
        drizzle-account-repository.adapter.ts
        drizzle-session-repository.adapter.ts
        drizzle-password-history-repository.adapter.ts
    web/
      change-password.controller.ts
      better-auth-docs.module.ts     # dev-only Swagger stubs
      better-auth-virtual.controller.ts
    hash/
      argon2-hash-adapter.ts
    email/
      smtp-email-adapter.ts
    captcha/
      google-captcha-adapter.ts
    token/
      hmac-token-adapter.ts
    audit-log/
      drizzle-audit-log-adapter.ts
    terms-version/
      env-terms-version-adapter.ts
    hooks/
      sign-up.hooks.ts
      sign-in.hooks.ts
      sign-out.hooks.ts
      google-oauth.hooks.ts
    i18n/
      messages.ts                    # Identity domain error translations
    guards/
      admin-bearer.guard.ts
    rate-limit/
      signup-ip-rate-limit.middleware.ts
    redis/
      redis.module.ts
      redis.constants.ts
  identity.module.ts                 # NestJS module wiring everything together
```

### Phase 2 — Database consolidation

All identity schemas merge into the single `DATABASE_URL` (no separate auth database). The Drizzle config in `apps/api/drizzle.config.ts` already uses the glob pattern `src/modules/**/infrastructure/persistence/*.schema.ts` — the new schema files are picked up automatically.

**Key change:** `apps/auth` used `AUTH_DATABASE_URL`. The identity module uses `DATABASE_URL` (the API's existing database connection). A single Drizzle instance (via `DrizzleModule`) is injected into all adapters.

### Phase 3 — Better Auth integration

Better Auth runs as a route handler inside `apps/api`. Integration approach:

- `apps/auth/src/infrastructure/better-auth/auth.ts` is moved to `src/modules/identity/infrastructure/better-auth/auth.ts`
- Better Auth mounts at `/api/v1/auth/*` (same path prefix as before)
- The `bodyParser: false` constraint from `apps/auth` must be applied **only** to Better Auth routes in the API bootstrap — all other API routes continue to use the default body parser
- The JWT guard in `apps/api/src/shared/guards/jwt-auth.guard.ts` currently fetches JWKS from an external URL. After migration, it can read the JWKS directly from the database (same process), but the external JWKS endpoint approach stays valid and is the simpler path for MVP — **no change to the JWT guard** for now

### Phase 4 — Environment variables

Merge env vars. The API now needs all vars previously required by `apps/auth`:

**Existing API vars (unchanged):**
```
DATABASE_URL
PORT
CORS
```

**Added from auth:**
```
BETTER_AUTH_SECRET
BETTER_AUTH_URL           # (was BETTER_AUTH_URL in auth)
AUTH_PRIVATE_KEY
AUTH_PUBLIC_KEY
ADMIN_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
REDIS_URL
RECAPTCHA_SECRET_KEY
TERMS_VERSION
```

**Removed (auth-as-microservice vars):**
```
AUTH_JWKS_URL             # no longer an external service
AUTH_ISSUER               # becomes BETTER_AUTH_URL
AUTH_AUDIENCE             # still needed for JWT validation
AUTH_DATABASE_URL         # merged into DATABASE_URL
```

`apps/api/src/env.ts` (new file, modeled after `apps/auth/src/env.ts`) validates all required vars at startup.

### Phase 5 — i18n error catalog

Identity domain error codes follow the API convention: `IDENTITY_<SCREAMING_SNAKE>`.

Auth error codes from `apps/auth` are renamed:
| Old code | New code |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | `IDENTITY_INVALID_CREDENTIALS` |
| `AUTH_INVALID_PASSWORD` | `IDENTITY_INVALID_PASSWORD` |
| `AUTH_NO_PASSWORD_ACCOUNT` | `IDENTITY_NO_PASSWORD_ACCOUNT` |
| `AUTH_PASSWORD_REUSE` | `IDENTITY_PASSWORD_REUSE` |

The module catalog (`src/modules/identity/infrastructure/i18n/messages.ts`) is spread into the root `src/infrastructure/i18n/domainMessages.ts`.

### Phase 6 — Delete apps/auth

After the identity module is complete and all tests pass, `apps/auth` is deleted from the monorepo. References in `turbo.json`, `package.json` workspaces, and any CI configuration are cleaned up.

### Phase 7 — Tests

Every layer of the identity module has tests. Test placement: `.spec.ts` files colocated next to the file under test (not in a separate `test/` directory, unlike existing API tests — follow the pattern mandated in `apps/api/CLAUDE.md`).

---

## 3. Architecture Decisions

### A. No cross-module imports

The identity module is a self-contained business unit. Other modules may not import from `src/modules/identity/`. Communication between modules happens only through:
- NestJS events (future)
- Shared domain primitives from `@repo/schemas` or `@repo/utils`

### B. Better Auth stays, wrapped behind ports

Better Auth is an implementation detail of the identity module's infrastructure layer. The domain and application layers have zero knowledge of Better Auth — they only know ports (interfaces). This means Better Auth is swappable without changing domain logic.

### C. Single Drizzle instance

A single `DRIZZLE_CLIENT` provider (already global in `DrizzleModule`) is injected into all Drizzle adapters, including identity adapters. No second database connection.

### D. Body parser split

The API bootstrap must apply `bodyParser: false` selectively (only on `/api/v1/auth/*` routes) to satisfy Better Auth's raw body requirement while keeping the standard body parser for all other routes.

### E. Redis stays optional

Redis is used by the auth service for rate limiting and caching. For MVP, Redis remains optional — if `REDIS_URL` is not set, the identity module falls back to in-memory rate limiting. This is the same behavior Better Auth has by default.

---

## 4. Code Style (inherits from CLAUDE.md)

- Strict TypeScript — no `any`, explicit return types on public functions
- Interfaces for object shapes, `type` for unions/mapped types
- Function declarations and named functions preferred
- async/await only — no `.then()`
- Zod for runtime validation at system boundaries (HTTP layer only)
- No barrel `index.ts` re-exports
- Error codes: `IDENTITY_<SCREAMING_SNAKE>` (uppercase module prefix, screaming snake suffix)
- File names: camelCase
- Domain exceptions carry only a code — no human-readable strings in the exception itself

---

## 5. Testing Strategy

### Coverage target: ≥80% for identity module

### Test types:

**Unit (use cases, domain, value objects)**
- Instantiate directly — no NestJS TestBed
- Mock outbound ports with `vi.fn()`
- Assert returned value or thrown exception

**Integration (adapters, controllers)**
- Use `@nestjs/testing` `Test.createTestingModule()` for controller tests
- Drizzle adapters: integration tests against a real test database (use `DATABASE_URL` pointing to a test DB)
- Better Auth hooks: mock the Better Auth context object

**Structure:**
```
src/modules/identity/
  domain/
    value-objects/password.value-object.spec.ts
    value-objects/user.value-object.spec.ts
    entities/user.entity.spec.ts
  application/
    use-cases/change-password.use-case.spec.ts
  infrastructure/
    persistence/repositories/drizzle-user-repository.adapter.spec.ts
    hash/argon2-hash-adapter.spec.ts
    web/change-password.controller.spec.ts
```

**Commands:**
```bash
npm -C apps/api test                          # run all
npm -C apps/api test:coverage                 # with coverage report
npx turbo test --filter @repo/api             # via turbo
```

---

## 6. Boundaries

### Always do
- Follow the hexagonal pattern: domain → application ports → infrastructure adapters
- Keep the identity module self-contained — no imports from other feature modules
- Use `IDENTITY_` prefix for all domain error codes
- Validate all environment variables at startup via `env.ts`
- Wrap all domain errors with the existing filter stack
- Apply `@Public()` on all Better Auth routes (they handle their own auth)
- Run `npx turbo typecheck --filter @repo/api` and `npx turbo lint --filter @repo/api` after each phase

### Ask before
- Changing the JWT validation strategy (e.g., reading JWKS from DB instead of the endpoint)
- Modifying `@repo/utils` or `@repo/schemas` shared packages
- Changing database schema in a breaking way (table renames, column drops)
- Adding a new external dependency not already in `apps/auth` or `apps/api`

### Never do
- Import from another feature module (e.g., `../region/...`)
- Use `any` or type assertions (`as SomeType`) to suppress TS errors
- Leave `console.log` in committed code
- Mutate objects — always spread/map/filter
- Skip validation pipes on HTTP endpoints
- Hardcode secrets — all sensitive values come from environment variables

---

## 7. Phase Execution Order

| Phase | Description | Acceptance Gate |
|---|---|---|
| 0 | Fix all existing API type errors | `tsc --noEmit` passes |
| 1 | Scaffold identity module structure (empty files) | All files exist; typecheck still passes |
| 2 | Copy + adapt domain layer from apps/auth | Domain unit tests pass |
| 3 | Copy + adapt application layer | Use case unit tests pass |
| 4 | Copy + adapt infrastructure layer (adapters, Better Auth, hooks) | Integration tests pass |
| 5 | Wire identity.module.ts + update app.module.ts | API boots; `/api/v1/auth/*` routes respond |
| 6 | Merge env vars; update bootstrap (body parser split) | Full typecheck + lint pass |
| 7 | Write all tests; hit ≥80% coverage | `npm -C apps/api test:coverage` ≥80% |
| 8 | Delete apps/auth; clean up workspace references | `npx turbo typecheck` (all) passes |

---

*This spec covers the full migration. Implementation follows `agent-skills:plan` → `agent-skills:build` per phase.*
