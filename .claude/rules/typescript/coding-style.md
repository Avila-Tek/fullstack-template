---
paths:
  - "**/*.ts"
  - "**/*.js"
---
# TypeScript Coding Style

> Extends [common/coding-style.md](../common/coding-style.md) with TypeScript-specific rules for this project.

## TypeScript Strictness

- No `any` or `as any` — use proper types or `unknown` with narrowing
- Explicit return types on all exported and public functions
- Prefer `interface` for object shapes; `type` for unions and mapped types
- No barrel `index.ts` re-exports — import from the specific module path

## Immutability

Use spread operator for immutable updates — never mutate objects or arrays in place.

## Use Case Pattern (Angular features)

Use cases in `application/useCases/` must be pure async functions. Dependencies are passed via a `deps` parameter — never import Angular DI inside a use case. Return a typed result object; never throw to the caller.

## Angular Signals

Use `signal()` for local component state. Read signals by calling them: `mySignal()`. Update with `.set()` or `.update()`. Do not assign to `.value` directly.

## Zod Validation

- Define schemas in `@repo/schemas` or `infrastructure/*.form.ts`
- Use `zodFieldValidator()` to bridge Zod into Angular `ValidatorFn`
- Use `schema.safeParse()` for validation that should not throw

## Console.log

No `console.log` in production code. The Stop hook audits this automatically.
