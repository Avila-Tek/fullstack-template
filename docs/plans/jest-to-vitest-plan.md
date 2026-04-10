# Plan: Migrate Test Runner from Jest to Vitest — apps/admin & apps/client

**Spec:** `docs/specs/SPEC-jest-to-vitest.md`
**Branch:** `feat/auth-integration-template`
**Scope:** `apps/admin`, `apps/client` — config and test setup files only

---

## Problem Statement

Both `apps/admin` and `apps/client` run tests with Jest, while:

- `apps/api` already uses Vitest
- Both apps' `CLAUDE.md` files already document Vitest as the standard (`vi.fn()`, `vi.mock()`)
- The existing test files import from `@jest/globals`, contradicting the documented standard

The polyfill shim (`jest.polyfills.ts`) manually patches globals that Vitest's jsdom environment
provides natively. The `next/jest` wrapper is no longer needed once Vitest handles transforms via
`@vitejs/plugin-react` and `vite-tsconfig-paths`.

---

## Dependency Graph

```
Phase 1 — apps/admin file changes (no install required yet)
  A1 [EDIT]   apps/admin/package.json     — swap Jest deps for Vitest, update scripts
    └→ A2 [CREATE] apps/admin/vitest.config.ts  — Vitest config (jsdom, globals, react plugin)
         └→ A3 [CREATE] apps/admin/vitest.setup.ts — setup (jest-dom/vitest + MSW lifecycle)
              └→ A4 [DELETE] jest.config.ts, jest.setup.ts, jest.polyfills.ts
                   └→ A5 [EDIT]   example.test.tsx — remove @jest/globals import

  ══════════════════════════════════════════════════

Phase 2 — apps/client file changes (same shape as Phase 1)
  B1 [EDIT]   apps/client/package.json
    └→ B2 [CREATE] apps/client/vitest.config.ts
         └→ B3 [CREATE] apps/client/vitest.setup.ts
              └→ B4 [DELETE] jest.config.ts, jest.setup.ts, jest.polyfills.ts
                   └→ B5 [EDIT]   example.test.tsx — remove @jest/globals, jest.mock→vi.mock,
                                                      jest.fn→vi.fn

  ══ CHECKPOINT 1 ══ npm install + npm -C apps/admin test + npm -C apps/client test

Phase 3 — Final monorepo validation
  V1: npx turbo typecheck
  V2: npx turbo lint
```

**Why Phases 1 and 2 before npm install:** All file changes (creates, edits, deletes) are done
first. A single `npm install` at the root resolves new deps and prunes removed ones in one pass
across both workspaces.

---

## Phase 1 — apps/admin

### A1 — Edit `apps/admin/package.json`

**Scripts — replace `"test"` block:**

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**devDependencies — remove:**

```
"@types/jest": "30.0.0"
"jest": "30.0.5"
"jest-environment-jsdom": "30.0.5"
"ts-jest": "29.4.1"
```

**devDependencies — add (use same major as apps/api: `^4.0.0` for vitest packages):**

```json
"@vitejs/plugin-react": "^4.0.0",
"@vitest/coverage-v8": "^4.0.0",
"jsdom": "^26.0.0",
"vite-tsconfig-paths": "^5.0.0",
"vitest": "^4.0.0"
```

**Acceptance criteria:**
- No `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom` keys remain in `devDependencies`
- `"test"` script value is `"vitest run"`
- `"test:watch"` and `"test:coverage"` scripts are present

---

### A2 — Create `apps/admin/vitest.config.ts`

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

**Acceptance criteria:**
- File exists at `apps/admin/vitest.config.ts`
- Uses `@vitejs/plugin-react` and `vite-tsconfig-paths` plugins
- `environment: 'jsdom'`, `globals: true`
- `setupFiles` points to `./vitest.setup.ts`
- `include` pattern matches the existing `src/__tests__/` location

---

### A3 — Create `apps/admin/vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';

import { server } from './src/__tests__/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Acceptance criteria:**
- Imports `@testing-library/jest-dom/vitest` (not `@testing-library/jest-dom`)
- MSW `server.listen / resetHandlers / close` lifecycle is preserved exactly

---

### A4 — Delete Jest files from apps/admin

| File | Action |
|---|---|
| `apps/admin/jest.config.ts` | Delete |
| `apps/admin/jest.setup.ts` | Delete |
| `apps/admin/jest.polyfills.ts` | Delete |

**Acceptance criteria:**
- None of the three files exist after this step

---

### A5 — Edit `apps/admin/src/__tests__/components/example.test.tsx`

**Change:** Remove the `@jest/globals` import — `describe`, `it`, and `expect` are now global via
`globals: true` in `vitest.config.ts`.

```typescript
// Remove this line:
import { describe, expect, it } from '@jest/globals';
```

No other changes to test logic or assertions.

**Acceptance criteria:**
- No `@jest/globals` import in the file
- `describe`, `it`, `expect` calls remain unchanged (no import needed)

---

## Phase 2 — apps/client

### B1 — Edit `apps/client/package.json`

Identical changes to A1 applied to `apps/client/package.json`.

**Acceptance criteria:** Same as A1 — Jest packages gone, Vitest packages and scripts present.

---

### B2 — Create `apps/client/vitest.config.ts`

Identical content to A2 (same `include` pattern `src/__tests__/**/*`, same plugins).

**Acceptance criteria:** Same as A2 — file exists with correct config.

---

### B3 — Create `apps/client/vitest.setup.ts`

Identical content to A3.

**Acceptance criteria:** Same as A3 — jest-dom/vitest import, MSW lifecycle preserved.

---

### B4 — Delete Jest files from apps/client

| File | Action |
|---|---|
| `apps/client/jest.config.ts` | Delete |
| `apps/client/jest.setup.ts` | Delete |
| `apps/client/jest.polyfills.ts` | Delete |

**Acceptance criteria:** Same as A4 — no Jest config files remain.

---

### B5 — Edit `apps/client/src/__tests__/components/example.test.tsx`

This test uses `jest.mock()` and `jest.fn()` in addition to the `@jest/globals` import.

**Before:**

```typescript
import { expect, it, jest } from '@jest/globals';
// ...
jest.mock('next/font/google', () => ({
  Inter: jest.fn(() => 'MockedInter'),
}));
```

**After:**

```typescript
// Remove the @jest/globals import entirely
// Replace jest.mock → vi.mock, jest.fn → vi.fn
vi.mock('next/font/google', () => ({
  Inter: vi.fn(() => 'MockedInter'),
}));
```

`vi` is globally available with `globals: true` — no import needed.

**Acceptance criteria:**
- No `@jest/globals` import
- `jest.mock` replaced with `vi.mock`
- `jest.fn` replaced with `vi.fn`
- Snapshot assertion and render call unchanged

---

## Checkpoint 1 — Install & Smoke Test

```bash
# Install new deps, prune removed deps across both workspaces
npm install

# Run test suites
npm -C apps/admin test
npm -C apps/client test

# Coverage smoke check (optional but recommended)
npm -C apps/admin run test:coverage
```

**Expected:**
- Both suites exit 0
- No `Cannot find module '@jest/globals'` errors
- No `jest is not defined` runtime errors
- Coverage report generated in `apps/admin/coverage/`

---

## Phase 3 — Final Monorepo Validation

### V1 — Typecheck

```bash
npx turbo typecheck
```

**Expected:** Zero type errors. Removing `@types/jest` means Jest-specific types (`jest.Mock`, etc.)
are gone — confirm no test file still references them.

### V2 — Lint

```bash
npx turbo lint
```

**Expected:** Zero lint violations. Biome may reorder imports in the new `vitest.config.ts` and
`vitest.setup.ts` — run `npx turbo lint:fix` if needed, then re-check.

---

## Final Acceptance Checklist

- [ ] `npm -C apps/admin test` — passes with Vitest
- [ ] `npm -C apps/client test` — passes with Vitest
- [ ] No `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom` in either `package.json`
- [ ] `jest.config.ts`, `jest.setup.ts`, `jest.polyfills.ts` deleted from both apps
- [ ] `vitest.config.ts` and `vitest.setup.ts` present in both apps
- [ ] `toBeInTheDocument()` and other jest-dom matchers work
- [ ] MSW server lifecycle intact
- [ ] No `@jest/globals` import in any test file
- [ ] No `jest.mock` / `jest.fn` calls remaining — replaced with `vi.*`
- [ ] `npx turbo typecheck` — passes
- [ ] `npx turbo lint` — passes
