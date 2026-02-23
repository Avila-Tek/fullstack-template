# CLAUDE.md — Frontend Architecture (apps/client/src)

## Repo Mental Model

We use a **Clean Architecture-inspired** model adapted to React and a **feature-driven** organization.

### Layers (outside → inside)

- **UI**: screens/components (rendering and visual state)
- **Application**: orchestration (use-cases, React Query hooks)
- **Domain**: business language (models + pure domain rules)
- **Infrastructure**: API/services, DTO transforms, technical concerns

**Dependency direction** (allowed):

```
UI → Application → Domain → Infrastructure
```

**Never** import in the opposite direction (except domain).

### Feature-driven organization

We group code by product functionality (a “feature”), not by technical type.

A feature is a complete user-facing capability, e.g.

**Promise:** If you delete `features/<feature>`, the rest of the app should still compile (that capability simply disappears).

### Suggested structure

```
src/
  app/                # Next.js routes (thin composition layer)
  features/           # Product features (vertical slices)
  shared/             # Cross-cutting UI + utilities
  lib/                # App-level helpers (query client, env, config)
```

> If your repo differs, follow the _intent_ above: routes are thin; features own their flows; shared is for reusable primitives.

## How to slice a feature

A feature should be removable without breaking the rest of the app.

```
[feature-name]/
  ui/
    pages/*.tsx  // — route-level screens (compose widgets; minimal logic)
    widgets/*.tsx // — self-contained sections (own loading/error/empty states)
    components/*.tsx // — reusable presentational pieces (small interactions only)
  application/
    queries/use*.query.ts // — React Query reads (cache keys, enabled, retries)
    mutations/use*.mutation.ts // — React Query writes
    use-cases/*.(usecase|use-case).ts` // — flow orchestration (simple API for UI)
  domain/
    *.model.ts //— domain entities/value objects (frontend-friendly shapes)
    *.logic.ts // — pure rules/invariants (no side effects)
  infrastructure/
    *.dto.ts // — DTO types (often imported from `packages/schemas`)
    *.transform.ts // — DTO ↔ Domain mapping
    *.service.ts // — data-access logic around calls (compose calls, payloads)
    interfaces.ts // — contracts for DI/mocking (optional)
```

## Boundaries (avoid spaghetti)

### 1) No feature-to-feature imports

- ✅ `features/<x>` may import from `shared/*`, `lib/*`, and packages (e.g. `@repo/services`).
- ❌ `features/<x>` importing `features/<y>/*` is not allowed.

If two features need the same thing:

- Promote to `shared/` if it’s generic UI/capability.
- Promote to `packages/*` if it’s truly cross-app and stable.
