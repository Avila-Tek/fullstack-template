---
paths:
  - "**/*.ts"
  - "**/*.js"
---
# TypeScript Patterns

> Extends [common/patterns.md](../common/patterns.md) with Angular and NestJS specific patterns.

## Angular Feature Structure

Every feature in `apps/client` follows Clean Architecture:

```
features/{feature}/
├── domain/           — interfaces, pure helpers, constants (no framework)
├── application/
│   └── useCases/    — pure async functions with explicit deps parameter
├── infrastructure/  — Angular services, Zod form schemas, HTTP transforms
└── ui/
    ├── components/  — presentational
    ├── layouts/     — route layout wrappers
    ├── pages/       — thin route leaf components
    └── widgets/     — stateful composite components
```

## Use Case Pattern

Use cases are plain async functions, not Angular services. Dependencies are injected via a `deps` parameter to keep them testable without a DI container. They return a typed result object — never throw to the caller.

## Monorepo Package Rule

If code is used by 2+ apps, it belongs in `packages/*`. Apps stay thin: only routes, page wiring, and app-specific configuration.

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

Use this shape consistently for all NestJS endpoint responses.

## Shared Schemas

Define Zod schemas in `@repo/schemas`. These are the single source of truth for types shared between the Angular apps and the NestJS API. Never duplicate type definitions.
