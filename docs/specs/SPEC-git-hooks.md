# SPEC: Git Hooks — Pre-commit & Pre-push Quality Gates

**Status:** Draft — pending user confirmation
**Date:** 2026-04-10
**Author:** Claude (Sonnet 4.6)

---

## 1. Objective

Add a standardized, developer-friendly git hooks layer to the monorepo that:

- Catches formatting, lint, and type errors **before a commit lands** (fast gate)
- Enforces the conventional commit message format documented in `CLAUDE.md`
- Runs the test suites for **only the changed packages** before a push reaches the remote (heavier gate)
- Makes `--no-verify` bypasses pointless by duplicating all checks in CI

**Success criteria:**

- `git commit` on staged `.ts`/`.tsx` files: Biome auto-fixes and blocks on unfixable violations
- `git commit` with a non-conventional message: blocked with a clear error
- `git push`: runs `turbo test` only for packages changed vs. `origin/development`; blocks on failures
- Pre-commit completes in **< 30 s** for typical staged sets
- Pre-push completes in **< 5 min** on a standard laptop
- `npx turbo typecheck` and `npx turbo lint` pass after the implementation

---

## 2. Tools

| Tool | Version | Role |
|---|---|---|
| `husky` | v9 | Git hook lifecycle management |
| `lint-staged` | latest | Run linters on staged files only |
| `@commitlint/cli` | latest | Validate commit message format |
| `@commitlint/config-conventional` | latest | Shared conventional-commit ruleset |

All installed as **root devDependencies** (not per-app), since hooks run at the monorepo level.

### Why Husky v9?

- Native npm `prepare` script integration — zero extra setup for new contributors
- Works with npm workspaces out of the box
- Lightweight: no runtime dependency, single binary
- Industry default for Node.js monorepos

---

## 3. Hook Definitions

### 3.1 `pre-commit` (fast — blocks commit)

**Runs:** on every `git commit`
**Goal:** fix auto-fixable issues silently; block on violations that need manual attention

**Steps (in order):**

1. **lint-staged** — runs Biome `check --write` on staged files
2. **turbo typecheck** — runs typecheck for all packages (Turbo cache makes this fast on re-runs)

**lint-staged configuration** (in `package.json` under `"lint-staged"` key):

```json
{
  "*.{ts,tsx}": ["biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"],
  "*.{json,md,css}": ["biome format --write --no-errors-on-unmatched --files-ignore-unknown=true"]
}
```

**Behavior:**
- Biome auto-fixes imports, formatting, and safe lint rules in place
- If an unfixable violation remains, the commit is blocked and the error is shown
- Typecheck uses Turbo's task cache — only re-checks packages whose source changed

**Script** (`.husky/pre-commit`):

```sh
#!/bin/sh
npx lint-staged
npx turbo typecheck
```

---

### 3.2 `commit-msg` (instant — blocks commit)

**Runs:** after the commit message is written
**Goal:** enforce the conventional commits format

**Expected format:**
```
<type>[optional scope]: <description>

<optional body>
```

Examples (all valid):
```
feat: add user registration endpoint
fix(auth): resolve token expiry bug
fix(auth): 📝 add fields to signUpInput schema
fix(api): correct JWT expiry validation
fix(client): update sign-in form error handling
refactor(admin): extract table pagination component
chore(all): update dependencies
```

**Scope** is optional. Established scopes (from `.vscode/settings.json`):

| Scope | Use for |
|---|---|
| `api` | `apps/api` changes |
| `client` | `apps/client` changes |
| `admin` | `apps/admin` changes |
| `frontend` | changes spanning both `client` and `admin` |
| `packages` | changes inside `packages/*` |
| `all` | cross-cutting changes touching multiple apps/packages |

New scopes can be added freely — `scope-enum` is intentionally **not enforced** by commitlint so the list can grow without a config change. When adding a new scope, also add it to `.vscode/settings.json` `conventionalCommits.scopes` for IDE autocomplete.

**Allowed types** (full conventional commits set):
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules (commitlint):**
- `type-enum`: only the types above are valid; must be lowercase
- `type-case`: lowercase required
- `subject-case`: **not enforced** — description is free-form (emojis and any casing allowed)
- `subject-empty`: empty description is blocked
- `subject-max-length`: 100 characters
- `body-max-line-length`: 200 characters
- `header-max-length`: 120 characters

**Script** (`.husky/commit-msg`):

```sh
#!/bin/sh
npx --no -- commitlint --edit "$1"
```

---

### 3.3 `pre-push` (heavier — blocks push)

**Runs:** on every `git push`
**Goal:** run tests for changed packages only; block if any test suite fails

**Changed package detection strategy:**

Uses Turbo's `--filter=...[origin/development]` syntax, which selects packages that have file changes compared to `origin/development`. This covers the entire PR's commit range, not just the last commit.

**Fallback:** if `origin/development` is not reachable (offline, new remote), the hook skips test execution with a warning rather than blocking the push.

**Script** (`.husky/pre-push`):

```sh
#!/bin/sh

echo "Running tests for changed packages..."

# Check if origin/development is reachable
if git ls-remote --exit-code origin development > /dev/null 2>&1; then
  npx turbo test --filter=...[origin/development] || exit 1
else
  echo "Warning: origin/development not reachable. Skipping changed-package test filter."
  echo "Run 'npx turbo test' manually before merging."
fi
```

**Note on test runners:** Admin and client use Jest; API uses Vitest. Turbo's `test` task is defined per-package, so `--filter=...[origin/development]` correctly runs the right runner per package.

---

## 4. Configuration Files

### 4.1 `commitlint.config.ts` (root)

```ts
import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    // Description is free-form: emojis, any casing, and optional scope are all valid
    "subject-case": [0],
    "subject-max-length": [2, "always", 100],
    "header-max-length": [2, "always", 120],
    "body-max-line-length": [2, "always", 200],
  },
};

export default config;
```

### 4.2 Root `package.json` additions

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"],
    "*.{json,md,css}": ["biome format --write --no-errors-on-unmatched --files-ignore-unknown=true"]
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^16.0.0",
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "@commitlint/types": "^19.0.0"
  }
}
```

> `prepare` runs automatically on `npm install`, so new contributors get hooks with no extra step.

---

## 5. Project Structure Changes

```
.
├── .husky/
│   ├── pre-commit       # lint-staged + turbo typecheck
│   ├── commit-msg       # commitlint
│   └── pre-push         # turbo test --filter=...[origin/development]
├── commitlint.config.ts # commitlint rules
├── package.json         # +prepare, +lint-staged config, +devDependencies
└── CLAUDE.md            # updated: document hooks + --no-verify policy
```

No changes to `apps/*`, `packages/*`, `turbo.json`, or `biome.json`.

---

## 6. Bypass Policy

### `--no-verify` discouragement

`--no-verify` skips all hooks. It is **explicitly prohibited** in this repository except for:

- Emergency hotfixes where CI is the safety net (requires a follow-up commit fixing the issue)
- Machine-generated commits (bots, release tooling) where hooks are not meaningful

**Why bypassing doesn't help:** CI runs `npx turbo typecheck`, `npx turbo lint`, and `npx turbo test` on every push. Any hook violation that was bypassed locally will block the PR in CI.

### CLAUDE.md addition

The following rule will be added to the root `CLAUDE.md` under a new "Git Hooks" section:

> **Never use `--no-verify`.** If a hook blocks you, fix the underlying issue. All hook checks are duplicated in CI — bypassing locally only delays the failure.

---

## 7. Testing the Implementation

After implementation, verify with:

```bash
# 1. Format violation — should auto-fix and not block
echo "const x=1" >> apps/api/src/main.ts
git add apps/api/src/main.ts
git commit -m "test: verify biome auto-fix"
# Expected: Biome fixes the formatting, commit succeeds

# 2. Bad commit message — should block
git commit --allow-empty -m "WIP: something"
# Expected: commitlint error — type 'WIP' is not allowed

# 3. Good commit message — should pass
git commit --allow-empty -m "chore: test commitlint"
# Expected: commit succeeds

# 4. Pre-push with changed package — should run only affected tests
git push
# Expected: only tests for packages with changes vs. origin/development are run
```

---

## 8. Acceptance Criteria

- [ ] `npm install` installs hooks automatically (via `prepare` script)
- [ ] Staged `.ts`/`.tsx` files are auto-formatted by Biome on commit
- [ ] Commit with unfixable lint error is blocked with clear message
- [ ] Commit with wrong message format is blocked with clear message
- [ ] Commit with valid message passes immediately
- [ ] `git push` runs only tests for packages changed vs. `origin/development`
- [ ] `git push` blocks on test failures
- [ ] `git push` with no changes to any package with tests completes without running tests
- [ ] Pre-commit completes in < 30 s for typical staged sets (5–20 files)
- [ ] `npx turbo typecheck` passes after implementation
- [ ] `npx turbo lint` passes after implementation
- [ ] CLAUDE.md updated with `--no-verify` policy

---

## 9. Boundaries

### Always do
- Keep hook scripts minimal — delegate all logic to existing tools (Turbo, Biome, commitlint)
- Install at root level only — no per-app hook config
- Preserve Turbo's cache — hooks must not pass flags that disable caching

### Ask before
- Changing the base ref in pre-push from `origin/development` to something else
- Adding a `pre-rebase` or `post-merge` hook
- Adding per-package lint-staged overrides
- Enabling `scope-enum` enforcement (would require keeping commitlint and `.vscode/settings.json` in sync)

### Never do
- Run `turbo build` in any hook — builds are for CI only
- Use `--no-cache` in Turbo hook commands — this defeats the performance benefit
- Shell-script complex logic in `.husky/` files — keep them 2–5 lines; delegate to `package.json` scripts

---

*Ready for `agent-skills:plan` → `agent-skills:build` once confirmed.*
