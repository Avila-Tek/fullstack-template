# TODO: Migrate Test Runner from Jest to Vitest

**Plan:** `docs/plans/jest-to-vitest-plan.md`
**Spec:** `docs/specs/SPEC-jest-to-vitest.md`

---

## Phase 1 — apps/admin

- [ ] **A1** — EDIT `apps/admin/package.json`
      Remove: `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom`
      Add: `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom`
      Update scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`

- [ ] **A2** — CREATE `apps/admin/vitest.config.ts`
      `globals: true`, `environment: 'jsdom'`, `@vitejs/plugin-react` + `vite-tsconfig-paths` plugins,
      `setupFiles: ['./vitest.setup.ts']`, `include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}']`

- [ ] **A3** — CREATE `apps/admin/vitest.setup.ts`
      Import `@testing-library/jest-dom/vitest`; MSW `server.listen / resetHandlers / close` lifecycle

- [ ] **A4** — DELETE `apps/admin/jest.config.ts`, `apps/admin/jest.setup.ts`, `apps/admin/jest.polyfills.ts`

- [ ] **A5** — EDIT `apps/admin/src/__tests__/components/example.test.tsx`
      Remove `import { describe, expect, it } from '@jest/globals'`

---

## Phase 2 — apps/client

- [ ] **B1** — EDIT `apps/client/package.json`
      Same dep changes and script updates as A1

- [ ] **B2** — CREATE `apps/client/vitest.config.ts`
      Identical content to A2

- [ ] **B3** — CREATE `apps/client/vitest.setup.ts`
      Identical content to A3

- [ ] **B4** — DELETE `apps/client/jest.config.ts`, `apps/client/jest.setup.ts`, `apps/client/jest.polyfills.ts`

- [ ] **B5** — EDIT `apps/client/src/__tests__/components/example.test.tsx`
      Remove `import { expect, it, jest } from '@jest/globals'`
      Replace `jest.mock(...)` → `vi.mock(...)`
      Replace `jest.fn(...)` → `vi.fn(...)`

---

### CHECKPOINT 1

- [ ] `npm install` — resolves new deps, prunes Jest packages
- [ ] `npm -C apps/admin test` — all tests pass with Vitest
- [ ] `npm -C apps/client test` — all tests pass with Vitest

---

## Phase 3 — Final Monorepo Validation

- [ ] **V1** `npx turbo typecheck` — zero type errors
- [ ] **V2** `npx turbo lint` — zero lint violations (run `npx turbo lint:fix` if needed, then recheck)

---

## Final Acceptance Checklist

- [ ] `npm -C apps/admin test` passes with Vitest
- [ ] `npm -C apps/client test` passes with Vitest
- [ ] No `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom` in either `package.json`
- [ ] `jest.config.ts`, `jest.setup.ts`, `jest.polyfills.ts` deleted from both apps
- [ ] `vitest.config.ts` and `vitest.setup.ts` present in both apps
- [ ] `toBeInTheDocument()` and other jest-dom matchers work
- [ ] MSW server lifecycle intact
- [ ] No `@jest/globals` import in any test file
- [ ] No `jest.mock` / `jest.fn` remaining — replaced with `vi.*`
- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo lint` passes
