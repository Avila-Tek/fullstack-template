# apps/client — Next.js end-user app

Next.js 15 (App Router) + React + TypeScript. Root rules apply.

## Commands

```bash
npx turbo typecheck --filter @repo/client
npx turbo lint --filter @repo/client          # fix: npx turbo lint:fix --filter @repo/client
npm -C apps/client test
```

## Feature structure

```
src/features/<feature>/
  domain/           # interfaces, pure helpers, constants (no framework)
  application/
    useCases/       # pure async functions with explicit deps parameter
  infrastructure/   # services, Zod form schemas, HTTP transforms
  ui/
    components/     # presentational
    layouts/        # route layout wrappers
    pages/          # thin route leaf components
    widgets/        # stateful composite components
```

## Naming

- Feature folders: `camelCase` (e.g., `userManagement`, `auth`)
- Route segments in `app/`: `kebab-case` (e.g., `forgot-password/`); route groups use `(group)`
- **React component files** (`.tsx`): `PascalCase` (e.g., `LoginForm.tsx`, `AuthCallbackPage.tsx`)
- **Non-component TS files** (`.ts`): `camelCase` — the folder is the role descriptor, not the filename:
  - `domain/auth.ts` — types, interfaces, pure logic, constants for the feature
  - `infrastructure/auth.ts` — API contract, transforms, service class
  - `infrastructure/auth.form.ts` — Zod form schema (**only suffix kept**, for discoverability)
  - `application/useCases/login.ts` — use case (plain camelCase verb phrase)
  - `application/mutations/useLogin.ts` — React Query mutation hook (`use` prefix)
  - `application/queries/useUsers.ts` — React Query query hook (`use` prefix)
- **i18n files**: `<lang>.ts` (e.g., `en.ts`, `es.ts`)
- **Test files**: `<FileName>.test.ts` / `<FileName>.test.tsx`

## Key rules

- **`.env.example` must stay in sync**: any time you add, rename, or remove a `process.env.*` reference, update `apps/client/.env.example` with a matching entry and an explanatory comment. Never leave an env var undocumented.
- **Prefer Server Components**. Add `'use client'` only when needed (browser APIs, local interactive state).
- **One React component per file**.
- **No barrel exports** (`index.ts`) as an export aggregator.
- **Absolute imports** via `@/` (avoid deep relative paths).
- **No `any` / `as any`**.
- Keep feature code **inside its feature**; don't import one feature from another.
- **UI components from `@repo/ui` only** — every interactive or visual element that has a shadcn equivalent must come from `packages/ui`. Never use raw `<input>`, `<button>`, `<label>`, `<a>`, `<textarea>`, `<select>`, `<h1>`–`<h6>`, `<p>`, `<span>` (as a styled atom), etc. directly in feature UI files. Use `<Input>`, `<Button>`, `<Label>`, Next.js `<Link>`, `<Textarea>`, `<Select>`, `<Typography>`, etc. from `@repo/ui` instead. Layout HTML (`<div>`, `<section>`, `<form>`, `<main>`, `<nav>`, etc.) is fine. If a needed component is not yet in `packages/ui`, add it first: `npx shadcn@latest add <component> --cwd packages/ui`. Full component list: https://ui.shadcn.com/llms.txt. Full rule: `docs/specs/SPEC-ui-component-enforcement.md`.

## Tests

- **Location**: test files live in `src/__tests__/` mirroring the `src/` structure (e.g. `src/features/auth/ui/widgets/LoginForm.tsx` → `src/__tests__/features/auth/ui/widgets/LoginForm.test.tsx`).
- Use Vitest (`vi`, `describe`, `it`, `expect`). Mock with `vi.fn()`.
- Use `test-utils/` wrappers — never render components without the shared provider setup.
