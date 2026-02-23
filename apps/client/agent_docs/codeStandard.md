# CLAUDE.md — Code Standards (apps/client/src/shared/code)

Keep changes consistent with this repo. Prefer clarity, small diffs, and predictable patterns.

## File & export conventions

- Use **camel-case** for files and folders.
- **One React component per file** (1 exported component).
- Prefer **named exports** (`export function X()`); Next.js **route files** (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`) may use **default exports**.
- Avoid **barrel exports** (`index.ts`) unless a package already depends on them.
- Co-locate files by feature; don't move code to `shared/` “just in case”.

## TypeScript

- **Strict**: no `any`, no `as any`, no unsafe coercion.
- Prefer **interfaces** for object shapes; use **type** for unions/mapped types.
- Add **explicit return types** for exported/public functions.
- Keep types close to usage; use `types.ts` only when shared inside a module.
- Validate **external data** (API, forms, env) with **Zod**.

## React & Next.js

- Prefer **Server Components**; minimize **`use client`**, `useEffect`, and local `setState`.
- Client components only for **browser APIs / interactivity**; keep them small.
- Use React APIs via **`React.*`** (import React, avoid importing hooks directly).
- Components must be **function declarations** (no React arrow components).
- Prefer composition over prop drilling; avoid passing props more than ~3 levels.

## UI / Styling

- Use **Tailwind CSS** + **shadcn/ui** (from `packages/ui`) + **Radix** + **Lucide**.
- Check `packages/ui` before installing new shadcn components.
- Build **responsive** UI (mobile-first); avoid bespoke styling patterns.

## Async & data work

- Prefer **async/await** over `.then()`.
- Parallelize independent work with **`Promise.all`**.
- Avoid `await` inside loops for independent operations.
- Use **TanStack React Query** for server-state (queries/mutations/cache/invalidation).
- Keep backend shapes (DTOs) out of UI; return **Domain-friendly** data from hooks/services.

## Rendering & readability

- Avoid short-circuit rendering with non-boolean conditions.
- Avoid nested ternaries; move branching outside JSX.
- Destructure props in the function signature; define defaults there.
- Avoid uncontrolled prop spreading (`{...props}`) unless intentional and typed.

## Error handling

- Don’t add error handling “just in case”.
- When needed: handle expected errors explicitly; keep user-facing messages safe.
- Unexpected errors should be logged/observed, not leaked to UI verbatim.
