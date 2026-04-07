# Coding Style

## Immutability (CRITICAL)

ALWAYS create new objects, NEVER mutate existing ones.

Rationale: Immutable data prevents hidden side effects, makes debugging easier, and works correctly with Angular's change detection and signals.

## File Organization

- 200–400 lines typical, 800 max per file
- High cohesion, low coupling
- Organize by feature/domain, not by type
- Angular features follow: `domain/` → `application/useCases/` → `infrastructure/` → `ui/`

## Angular-Specific Style

- Use `signal()` for local component state — never `BehaviorSubject` for local state
- Use `inject()` in field initializers — not constructor parameter injection
- Standalone components only — no NgModules
- Reactive Forms (`FormBuilder`) — not template-driven forms
- Functional guards (`CanActivateFn`) — not class-based guards
- Lazy-load routes with `loadComponent()`

## Error Handling

- Handle errors explicitly at every level
- Use cases return `{ success, error? }` — never throw to the caller
- Provide user-friendly error messages in Angular components (via signals)
- Log detailed context server-side (NestJS)
- Never silently swallow errors

## Input Validation

- Validate all user input at system boundaries
- Angular forms: use `zodFieldValidator()` from `@repo/schemas` or feature's `infrastructure/*.form.ts`
- NestJS controllers: use DTOs with Zod or class-validator on every request body and query param
- Never trust external data

## Linting and Formatting

This project uses **Biome** (not ESLint or Prettier). Run:
- Check: `npx turbo lint`
- Fix: `npx turbo lint:fix`

Biome enforces: alphabetical import sorting, merged imports from the same module, `export type` before value exports.

## Code Quality Checklist

Before marking work complete:
- [ ] Functions are small (<50 lines)
- [ ] Files are focused (<800 lines)
- [ ] No deep nesting (>4 levels)
- [ ] No `any` / `as any`
- [ ] No `console.log` in committed code
- [ ] No mutation (spread / map / filter instead)
- [ ] No hardcoded values — use constants or environment variables
- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo lint` passes
