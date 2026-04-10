# Plan: Git Hooks — Pre-commit & Pre-push Quality Gates

**Spec:** [docs/specs/SPEC-git-hooks.md](../docs/specs/SPEC-git-hooks.md)
**Date:** 2026-04-10
**Branch:** feat/auth-integration-template (add as a new commit on current branch)

---

## Dependency Graph

```
T1: Install deps + configure package.json
        ↓
T2: Initialize Husky (.husky/ directory)
        ↓
    ┌───┴──────────┬──────────────┐
T3: pre-commit   T4: commit-msg  T5: pre-push
    └───────────────┬────────────┘
                    ↓
          T6: commitlint.config.ts
                    ↓
          T7: Update CLAUDE.md
                    ↓
          T8: End-to-end verification
```

T3, T4, T5, T6 can be written in any order after T2. T7 and T8 are last.

---

## Tasks

### T1 — Install dependencies + configure `package.json`

**What:** Add 5 new root-level devDependencies, a `prepare` script, and the `lint-staged` config block.

**Files changed:**
- `package.json` (root only)

**Exact changes to `package.json`:**

```json
// scripts — add:
"prepare": "husky"

// lint-staged — add top-level key:
"lint-staged": {
  "*.{ts,tsx}": ["biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"],
  "*.{json,md,css}": ["biome format --write --no-errors-on-unmatched --files-ignore-unknown=true"]
}

// devDependencies — add:
"@commitlint/cli": "^19.0.0",
"@commitlint/config-conventional": "^19.0.0",
"@commitlint/types": "^19.0.0",
"husky": "^9.0.0",
"lint-staged": "^16.0.0"
```

**Install command:**
```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional @commitlint/types
```

**Acceptance:**
- `node_modules/husky` exists
- `node_modules/lint-staged` exists
- `node_modules/@commitlint/cli` exists
- `package.json` has `"prepare": "husky"` in scripts

---

### T2 — Initialize Husky

**What:** Run `husky init` to scaffold the `.husky/` directory and wire up the `prepare` hook. Then clean the generated sample file.

**Commands:**
```bash
npx husky init
# This creates .husky/pre-commit with a placeholder — we'll overwrite it in T3
```

**Acceptance:**
- `.husky/` directory exists
- `.husky/pre-commit` exists (content will be replaced in T3)
- `git config core.hooksPath` returns `.husky` (or running `git config --list | grep hooks`)

---

### T3 — Create `.husky/pre-commit`

**What:** Write the pre-commit hook script. Runs lint-staged (Biome on staged files) then typecheck across all packages via Turbo (cached).

**File:** `.husky/pre-commit`

```sh
npx lint-staged
npx turbo typecheck
```

> No `#!/bin/sh` shebang needed in Husky v9 — Husky runs hooks via `sh` by default.

**Performance note:** `turbo typecheck` depends on `^build` per `turbo.json`. On the first run it builds dependency packages; subsequent runs hit Turbo's cache and are fast (< 5 s on warm cache).

**Acceptance:**
- File is executable (`ls -la .husky/pre-commit` shows `-rwxr-xr-x`)
- `cat .husky/pre-commit` shows both lines
- Staging a `.ts` file and running `git commit` triggers Biome and typecheck

---

### T4 — Create `.husky/commit-msg`

**What:** Write the commit-msg hook. Delegates to commitlint, which validates the message against `commitlint.config.ts`.

**File:** `.husky/commit-msg`

```sh
npx --no -- commitlint --edit "$1"
```

> `--no` prevents npx from downloading a package if commitlint is not found locally — it fails fast instead.

**Acceptance:**
- File is executable
- `echo "WIP: bad message" | npx commitlint` exits non-zero
- `echo "feat: good message" | npx commitlint` exits zero

---

### T5 — Create `.husky/pre-push`

**What:** Write the pre-push hook. Runs `turbo test` scoped to packages changed vs. `origin/development`. Skips gracefully if offline.

**File:** `.husky/pre-push`

```sh
echo "Running tests for changed packages..."

if git ls-remote --exit-code origin development > /dev/null 2>&1; then
  npx turbo test --filter=...[origin/development] || exit 1
else
  echo "Warning: origin/development not reachable. Skipping changed-package test filter."
  echo "Run 'npx turbo test' manually before merging."
fi
```

**Acceptance:**
- File is executable
- `git ls-remote` check works (can be tested manually)
- On a branch with no changed packages, `turbo test --filter=...[origin/development]` completes with "no tasks were executed"

---

### T6 — Create `commitlint.config.ts`

**What:** Write the commitlint configuration. Extends `@commitlint/config-conventional`, restricts type to the 11 standard types, and disables subject-case enforcement (emojis and free-form descriptions are allowed).

**File:** `commitlint.config.ts` (root)

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

**Acceptance:**
- `npx commitlint --from HEAD~1 --verbose` parses config without errors
- `echo "WIP: bad" | npx commitlint` → non-zero exit, error mentions "type must be one of"
- `echo "feat(api): 🚀 launch" | npx commitlint` → zero exit (emoji + scope passes)
- `echo "fix(client): Update Form" | npx commitlint` → zero exit (uppercase description passes)

---

### T7 — Update `CLAUDE.md`

**What:** Add a "Git Hooks" section documenting the three hooks and the `--no-verify` prohibition.

**File:** `CLAUDE.md` (root)

**New section to append:**

```markdown
## Git Hooks

Three hooks are active on this repo (managed by Husky v9):

| Hook | Runs on | What it checks |
|---|---|---|
| `pre-commit` | `git commit` | Biome format+lint on staged files; full typecheck |
| `commit-msg` | `git commit` | Conventional commit message format |
| `pre-push` | `git push` | Tests for packages changed vs. `origin/development` |

Commit message format: `<type>[optional scope]: <description>`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scope is optional and free-form (e.g., `fix(api): ...`, `feat(client): 🚀 ...`)
- Description is free-form — emojis and any casing are allowed

**Never use `--no-verify`.** All hook checks are duplicated in CI — bypassing locally only delays the failure. If a hook blocks you, fix the underlying issue.

When adding a new commit scope, also add it to `.vscode/settings.json` → `conventionalCommits.scopes`.
```

**Acceptance:**
- Section exists in CLAUDE.md
- `npx turbo lint` still passes (Biome doesn't lint CLAUDE.md in error mode)

---

### T8 — End-to-end verification

**What:** Confirm all hooks work correctly and the codebase still typechecks and lints cleanly.

**Commands to run:**

```bash
# 1. Typecheck — must pass
npx turbo typecheck

# 2. Lint — must pass
npx turbo lint

# 3. commitlint smoke test
echo "WIP: bad message" | npx commitlint           # must fail
echo "feat: good message" | npx commitlint          # must pass
echo "fix(api): 📝 add field" | npx commitlint      # must pass (emoji + scope)
echo "chore(all): Update Deps" | npx commitlint     # must pass (uppercase desc)

# 4. Hook files are executable
ls -la .husky/
```

**Acceptance — all of the following must be true:**
- [ ] `npx turbo typecheck` exits 0
- [ ] `npx turbo lint` exits 0
- [ ] Bad commit message exits non-zero with clear error
- [ ] Good commit messages (with emoji, scope, uppercase desc) exit 0
- [ ] `.husky/pre-commit`, `.husky/commit-msg`, `.husky/pre-push` are all executable

---

## Checkpoints

| After | Gate |
|---|---|
| T2 | `.husky/` exists; `git config core.hooksPath` shows `.husky` |
| T6 | `npx commitlint` parses config without errors |
| T8 | All acceptance criteria in spec §8 are met |

---

## What is NOT in scope

- CI pipeline changes (hooks duplicate CI, but CI config is unchanged here)
- Per-app lint-staged overrides
- `pre-rebase` or `post-merge` hooks
- `scope-enum` enforcement
