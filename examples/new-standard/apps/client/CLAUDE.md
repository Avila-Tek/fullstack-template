# CLAUDE.md — apps/client (Frontend)

## What we’re building

A **Next.js 15 (App Router)** frontend inside a Turborepo monorepo. Optimize for:

- **Fast UX** (Web Vitals, minimal client JS)
- **Maintainability** (clear boundaries, feature-first structure)
- **Type safety** (strict TS + Zod validation)

## Primary stack

- **Next.js 15** (SSR/RSC, App Router)
- **React**
- **TypeScript** (strict)
- **Tailwind CSS**
- **shadcn/ui** (via our shared UI package when available)
- **@tanstack/react-query** (server-state caching)
- **react-hook-form + zod** (forms + validation)
- **Auth:** better-auth

Repo tooling (already configured): **Turborepo**, **npm workspaces**, **Biome**, **Renovate**.

---

## Workflow guardrails

Follow **Research → Plan → Implement → Validate**.

1. **Research**: read existing code + patterns first.
2. **Plan**: write a short plan (steps + files to touch + risks) and ask for approval.
3. **Implement**: smallest consistent change.
4. **Validate**: typecheck + lint (+ tests when present).

**Never** start a dev server or curl a local endpoint.

---

## Non‑negotiables (quick rules)

- **Prefer Server Components**. Add `'use client'` only when needed (browser APIs, local interactive state).
- **One React component per file**.
- **camel-case** for files & folders.
- **No barrel exports** (`index.ts`) as an export aggregator.
- **Absolute imports** via `@/` (avoid deep relative paths).
- **No `any` / `as any`**.
- Keep feature code **inside its feature**; don’t import one feature from another.
- If logic grows inside a component, **extract** to a helper or hook.

---

## Where to look next (progressive disclosure)

When working on a task, open the most relevant nested guide(s) below before coding:

- **Architecture & boundaries**: `agent_docs/architecture.md`
- **Data fetching (React Query, hydration, caching)**: `agent_docs/dataFetching.md`
- **UI/styling (shadcn, Tailwind, accessibility)**: `agent_docs/shadcn.md`
- **Code standards (short + strict)**: `agent_docs/codeStandard.md`
- **Performance & Web Vitals**: `agent_docs/performance.md`
- **Testing**: `agent_docs/testing.md`

---
