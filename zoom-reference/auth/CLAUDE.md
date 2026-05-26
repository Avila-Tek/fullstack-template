# apps/auth — NestJS Auth Service (Better Auth)

Standalone Identity Provider using Better Auth 1.x + Drizzle (PostgreSQL). Root rules apply.

## Stack

- NestJS 11 + Better Auth 1.x + Drizzle
- Port: **3001** — separate from `apps/api` (port 3002)
- Own database: `AUTH_DATABASE_URL`

## Critical constraints

- `bodyParser: false` in `main.ts` bootstrap — Better Auth needs raw request body. Do NOT add global body-parser middleware.
- Middleware order in `configure()`: `correlationId` → `sentryScope` → rate-limiting → `json()` (json excluded from Better Auth paths).
- Better Auth docs module is only imported in non-production environments.

## Module structure

```
src/
  main.ts / app.module.ts
  domain/            entities, valueObjects, events, exceptions
  application/
    ports/in/        use case contracts (inbound ports)
    ports/out/       repository / service contracts (outbound ports)
    useCases/
  infrastructure/
    betterAuth/      Better Auth singleton (owns its own DB pool)
    database/        Drizzle module, schema, repositories
    hooks/           Better Auth lifecycle hooks (signUp, signIn, …)
  shared/            logger, metrics, utils
```

## Better Auth hooks pattern

- Check https://better-auth.com/llms.txt for info in Better Auth implementations
- Each hook exports a **core handler** (pure business logic, no telemetry) and a **wrapped handler** (core + audit log + metrics).
- The wrapped handler is registered with Better Auth; the core handler is used in unit tests.

## Error handling & i18n

- Domain exceptions carry only an error code: `AUTH_<SCREAMING_SNAKE>`.
- Single translation catalog at `infrastructure/i18n/domainMessages.ts`.
- Message resolution only in the filter layer. Status ≥ 500 → `INTERNAL_ERROR`.

### Adding a new domain error

1. Create exception in `domain/exceptions/` — `super('AUTH_<CODE>')`.
2. Add code to `AuthErrorCode` union + translations in `infrastructure/i18n/domainMessages.ts`.
3. Map to HTTP status in `DomainToHttpMapper` if non-default.
4. Run `npx turbo typecheck --filter @zoom/auth-service`.

## Orchestrator routing

All controllers in this app are proxied through `apps/orchestrator` (port 3000 → auth port 3001). When adding a **new top-level `@Controller` prefix** update **`apps/orchestrator/src/app.module.ts`** in three places:

| Place | Pattern style |
|---|---|
| Auth proxy **`forRoutes`** | `'prefix/*'` (+ `'prefix'` only if a route exists at the bare path) |
| API proxy **`.exclude()`** | same as forRoutes |
| Inactivity middleware **`.exclude()`** | `'api/v1/prefix/*'` (+ `'api/v1/prefix'` if needed) — must include `api/v1/` |

**Rules — avoid bootstrap errors:**
- Add `'prefix'` (no wildcard) only when a handler exists at the exact base path (e.g. `GET /systems`). If all routes are nested, `'prefix/*'` alone is enough.
- Always put the slash **before** `*`: `'prefix/*'` ✓ — never `'prefix*'` ✗ (path-to-regexp v8 rejects bare `*` not preceded by `/`).
- Inactivity middleware exclusions need the full `api/v1/` prefix; proxy `forRoutes`/`exclude` patterns do not.

## Commands

```bash
npx turbo typecheck --filter @zoom/auth-service
npx turbo lint --filter @zoom/auth-service
npx turbo test --filter @zoom/auth-service
npm run db:generate && npm run db:migrate
```
