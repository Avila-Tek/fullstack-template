# SPEC: Migrate Test Runner from Jest to Vitest — apps/admin & apps/client

**Status:** Draft — pending user confirmation
**Date:** 2026-04-10
**Author:** Claude (Sonnet 4.6)

---

## 1. Objective

Replace Jest with Vitest as the test runner in `apps/admin` and `apps/client` so that:

- Both apps match the Vitest setup already in place in `apps/api` and already documented in both apps' `CLAUDE.md` files (docs are ahead of implementation)
- `vi.fn()`, `describe`, `it`, and `expect` are the standard test APIs across the entire monorepo
- The polyfill shim file (`jest.polyfills.ts`) is eliminated — Vitest's jsdom environment natively provides web APIs
- The `next/jest` wrapper dependency is removed — Vitest handles TypeScript and path aliases directly via `@vitejs/plugin-react` and `vite-tsconfig-paths`

**Success criteria:**

- `npm -C apps/admin test` and `npm -C apps/client test` execute with Vitest
- All existing tests pass without modification to test logic
- `@jest/globals` import in test files is replaced by Vitest globals (no import required with `globals: true`)
- `npx turbo typecheck` passes after migration
- `npx turbo lint` passes after migration

---

## 2. Tools

| Package | Role | Action |
|---|---|---|
| `vitest` | Test runner | Add to each app |
| `@vitest/coverage-v8` | Coverage reporter (v8) | Add to each app |
| `@vitejs/plugin-react` | Transforms JSX/TSX for Vite/Vitest | Add to each app |
| `vite-tsconfig-paths` | Resolves `@/*` and `@repo/*` path aliases | Add to each app |
| `jsdom` | DOM environment for browser-like tests | Add to each app |
| `jest` | Old test runner | **Remove** from each app |
| `ts-jest` | TypeScript transform for Jest | **Remove** from each app |
| `@types/jest` | Jest type declarations | **Remove** from each app |
| `jest-environment-jsdom` | jsdom environment for Jest | **Remove** from each app |

`@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` remain — they are
framework-agnostic. `@testing-library/jest-dom` v6 ships a Vitest-compatible entry point at
`@testing-library/jest-dom/vitest`.

`dotenv` removal is deferred — check whether it is imported anywhere outside the jest config before
removing it.

---

## 3. Changes per App

Both apps are identical in structure, so the same changes apply to `apps/admin` and `apps/client`.
All paths below are relative to the app root (e.g., `apps/admin/`).

### 3.1 `package.json`

**Scripts — update:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**devDependencies — remove:**

```
jest
ts-jest
@types/jest
jest-environment-jsdom
```

**devDependencies — add:**

```
vitest
@vitest/coverage-v8
@vitejs/plugin-react
vite-tsconfig-paths
jsdom
```

### 3.2 `vitest.config.ts` (new file)

```typescript
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
    },
  },
});
```

**Why `globals: true`:** Matches the `apps/api` convention and the CLAUDE.md rule `vi`, `describe`,
`it`, `expect` are available without imports, keeping test files clean.

**Why no `dotenv` call:** Vitest's `loadEnv` can be used if env vars are needed in tests. Since
current tests (`createLoginDefaultValues`, mock handlers) make no `process.env` reads, this is not
required for the existing suite. If it becomes necessary, add `envFile: '.env.local'` under `test:`.

### 3.3 `vitest.setup.ts` (new file, replaces `jest.setup.ts`)

```typescript
import '@testing-library/jest-dom/vitest';

import { server } from './src/__tests__/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

The only change from `jest.setup.ts` is the import path:
`@testing-library/jest-dom` → `@testing-library/jest-dom/vitest`.

### 3.4 Files to delete

| File | Reason |
|---|---|
| `jest.config.ts` | Replaced by `vitest.config.ts` |
| `jest.setup.ts` | Replaced by `vitest.setup.ts` |
| `jest.polyfills.ts` | Vitest's jsdom environment provides all these globals natively |

### 3.5 Test file updates

The only existing test file in each app imports from `@jest/globals`:

```typescript
// Before
import { describe, expect, it } from '@jest/globals';

// After — remove the import entirely (globals: true makes them available)
```

No other test logic changes are required.

---

## 4. Project Structure After Migration

```
apps/admin/                     apps/client/
├── vitest.config.ts  ← new     ├── vitest.config.ts  ← new
├── vitest.setup.ts   ← new     ├── vitest.setup.ts   ← new
├── jest.config.ts    ← DELETE  ├── jest.config.ts    ← DELETE
├── jest.setup.ts     ← DELETE  ├── jest.setup.ts     ← DELETE
├── jest.polyfills.ts ← DELETE  ├── jest.polyfills.ts ← DELETE
└── package.json      ← update  └── package.json      ← update
```

`turbo.json` does not need changes — the `test` task is already defined as `"test": {}` and delegates
to each app's `package.json` script.

---

## 5. Verification Steps

```bash
# 1. Install updated dependencies
npm install

# 2. Run tests for each app
npm -C apps/admin test
npm -C apps/client test

# 3. Coverage smoke check
npm -C apps/admin run test:coverage

# 4. Full monorepo checks
npx turbo typecheck
npx turbo lint
```

Expected: all tests pass, no `@jest/globals` import errors, no TypeScript errors about missing Jest
types.

---

## 6. Acceptance Criteria

- [ ] `npm -C apps/admin test` runs with Vitest and all tests pass
- [ ] `npm -C apps/client test` runs with Vitest and all tests pass
- [ ] No `jest`, `ts-jest`, `@types/jest`, or `jest-environment-jsdom` remain in either app's `package.json`
- [ ] `jest.config.ts`, `jest.setup.ts`, and `jest.polyfills.ts` are deleted from both apps
- [ ] `vitest.config.ts` and `vitest.setup.ts` exist in both apps
- [ ] `@testing-library/jest-dom` matchers (e.g., `toBeInTheDocument`) work in tests
- [ ] MSW server lifecycle (`beforeAll/afterEach/afterAll`) is preserved in the new setup file
- [ ] No `import ... from '@jest/globals'` remains in any test file
- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo lint` passes

---

## 7. Boundaries

### Always do
- Keep the same test file locations (`src/__tests__/`) — no structural change to tests
- Preserve MSW server setup — required for HTTP mock handlers
- Match `apps/api` conventions: `globals: true`, v8 coverage, `vite-tsconfig-paths`

### Ask before
- Changing the test file include pattern (currently `src/__tests__/**/*`)
- Adding `@vitest/browser` for actual browser execution instead of jsdom
- Removing `dotenv` from either app's dependencies (may be used elsewhere)
- Adding a root-level `vitest.workspace.ts` to run all apps from one command

### Never do
- Change test logic or test assertions as part of this migration
- Migrate `apps/api` — it already uses Vitest
- Add new tests as part of this migration task

---

*Ready for `agent-skills:plan` → `agent-skills:build` once confirmed.*
