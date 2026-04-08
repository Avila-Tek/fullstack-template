# CLAUDE.md (Monorepo Root)

This file defines **how Claude should work in this Turborepo monorepo**.
It applies repo-wide to `apps/*` and `packages/*`.

> If a subfolder has its own `CLAUDE.md`, follow the **more specific** rules there.

---

## Repo overview

**Turborepo + npm workspaces** monorepo.

```
.
├── apps/
│   ├── client/         # Next.js app (end-user)
│   ├── admin/          # Next.js app (admin)
│   └── api/            # API service (Node/TS)
├── packages/
│   ├── ui/             # shadcn/ui components + Tailwind tokens/utilities
│   ├── schemas/        # Zod schemas + shared DTO types
│   ├── services/       # Shared service clients/adapters built on schemas
│   ├── utils/          # Shared helpers (no framework coupling)
│   ├── feature-flags/  # Feature flags
│   └── typescript-config/ # Shared tsconfig presets
├── biome.json
├── turbo.json
└── package.json
```

**Monorepo rule of thumb**

- If something is used by **2+ apps**, it belongs in `packages/*`.
- Keep apps thin: routes/pages + wiring; shared foundations live in packages.

---

## Stack

### Frontends

- **Next.js (v15)** (App Router; SSR/RSC when applicable)
- **React**
- **TypeScript** (strict)
- **Tailwind CSS**
- **shadcn/ui** + **Lucide React**
- **React Hook Form**
- **React Query** (`@tanstack/react-query`)

### Backend

- **TypeScript, Node >=20, NestJS**

### Platform / tooling

- **Turborepo**
- **npm workspaces**
- **Biome** (lint/format)
- **Renovate** (dependency updates)

---

## How Claude should work

### Research → Plan → Implement → Validate

- **Research**: read relevant files and follow existing patterns.
- **Plan**: write a short plan (steps + files + risks).
- **Implement**: smallest consistent change set.
- **Validate**: run the checks below.

### Development cycle (must follow)

1. **Before writing any code**, produce a plan and **ask the user for permission** to execute it.
2. After implementing, run:
   - `npx turbo typecheck`
   - `npx turbo lint`
3. If lint fails:
   - `npx turbo lint:fix`
4. Tests (when applicable):
   - `npx turbo test --filter @app/<web/api/db>`
5. **Never** start a dev server or `curl` local endpoints.

---

## Repo-wide conventions

### General

- **Minimal comments** (only “why”, not “what”).
- Prefer **tests as documentation**.

### TypeScript

- **No `any` / `as any`**.
- Prefer **interfaces** for object shapes; use `type` for unions/mapped types.
- Public functions: **explicit return types**.
- Prefer **function declarations** and **named functions**.
- Prefer **async/await** over `.then()`.
- Use **Zod** for runtime validation at boundaries.
- Avoid barrel re-exports (`index.ts`) that hide boundaries.

---

## Where to look next (progressive disclosure)

When working on a task, open the most relevant nested guide(s) below before coding:

- **app/client**: `apps/client/CLAUDE.md`
- **app/admin**: `apps/admin/CLAUDE.md`
- **app/api**: `apps/api/CLAUDE.md`

---
