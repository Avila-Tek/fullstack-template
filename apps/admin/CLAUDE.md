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
- **Data fetching (React Query, hydration, caching)**: `apps/client/src/lib/data/CLAUDE.md`
- **UI/styling (shadcn, Tailwind, accessibility)**: `apps/client/src/shared/ui/CLAUDE.md`
- **Code standards (short + strict)**: `apps/client/src/shared/code/CLAUDE.md`
- **Performance & Web Vitals**: `apps/client/src/shared/performance/CLAUDE.md`

---

Data Fetching

- Use TanStack React Query to handle global state and data fetching.
- Prefetch query using RSC and then dehydrate like this

  ```tsx
  import React from 'react';
  import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
  import { pokemonOptions } from '@/app/pokemon';
  import { getQueryClient } from '@/app/get-query-client';
  import { PokemonInfo } from './pokemon-info';

  export default function Home() {
    const queryClient = getQueryClient();

    void queryClient.prefetchQuery(pokemonOptions);

    return (
      <main>
        <h1>Pokemon Info</h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <PokemonInfo />
        </HydrationBoundary>
      </main>
    );
  }
  ```

- Implement validation using Zod for schema validation.

Security and Performance

- Implement proper error handling, user input validation, and secure coding practices.
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency.
