# apps/api — NestJS API

NestJS + Clean Architecture + DDD. Root rules apply.

## Commands

```bash
npx turbo typecheck --filter @repo/api
npx turbo lint --filter @repo/api          # fix: npx turbo lint:fix --filter @repo/api
npm -C apps/api test
```

## Module structure

```
src/modules/<feature>/
  domain/           # entities, value objects, events, exceptions
  application/
    ports/in/       # inbound port interfaces
    ports/out/      # outbound port interfaces
    use-cases/
  infrastructure/
    persistence/    # Drizzle adapters
    web/            # NestJS controllers
test/               # Test files mirroring the src/ folder structure
```

## Key rules

- **Drizzle**: inject via `@Inject(DRIZZLE_CLIENT) private db: NodePgDatabase`. No raw SQL.
- **DTOs**: `createZodDto(schema)` + `ZodValidationPipe`. Prefer schemas from `@repo/schemas`.
- **Guards**: protect routes with `@UseGuards(AuthGuard)`; use `@Public()` decorator to opt out.
- **Response envelope**: all responses are wrapped automatically; use `@SkipApiResponse()` on routes that return raw bodies (e.g. health checks).
- **Rate limiting**: global `ThrottlerGuard` is applied via `APP_GUARD`; default 100 req / 60 s in production.
- **No `any`**, no `console.log` in module files, no domain logic in adapters.

## Error handling & i18n

- Domain exceptions carry only an error code — never a human-readable message.
- Code convention: `<MODULE>_<SCREAMING_SNAKE>` (e.g. `REGION_COUNTRY_NOT_FOUND`).
- Translation catalogs live in `modules/<feature>/infrastructure/i18n/messages.ts`; spread into `infrastructure/i18n/domainMessages.ts`.
- Message resolution happens only in the filter layer (`DomainExceptionFilter`, `HttpExceptionFilter`).
- Status ≥ 500 always resolves to `INTERNAL_ERROR` — never leak raw error details.

### Adding a new domain error

1. Create exception subclass in `modules/<feature>/domain/exceptions/` — `super('<MODULE>_<CODE>')`.
2. Add code to type union + translations in `modules/<feature>/infrastructure/i18n/messages.ts`.
3. Spread module catalog into `infrastructure/i18n/domainMessages.ts` (new module only).
4. Map to HTTP status in `DomainToHttpMapper` if non-default.
5. Run `npx turbo typecheck --filter @repo/api` — missing translations are type errors.

## Tests

- **Location**: test files live in `test/` mirroring the `src/` folder structure (e.g. `src/modules/identity/application/use-cases/foo.ts` → `test/modules/identity/application/use-cases/foo.spec.ts`).
- Instantiate use cases directly — no TestBed. Mock ports with `vi.fn()`. Assert on returned value or thrown exception.
