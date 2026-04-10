# Todo: Git Hooks Implementation

**Plan:** [tasks/plan.md](./plan.md)
**Spec:** [docs/specs/SPEC-git-hooks.md](../docs/specs/SPEC-git-hooks.md)

---

- [ ] **T1** — Install deps + configure `package.json` (husky, lint-staged, @commitlint/*, prepare script, lint-staged config)
- [ ] **T2** — Initialize Husky (`npx husky init` → creates `.husky/` directory)
- [ ] **T3** — Create `.husky/pre-commit` (lint-staged + turbo typecheck)
- [ ] **T4** — Create `.husky/commit-msg` (commitlint --edit)
- [ ] **T5** — Create `.husky/pre-push` (turbo test --filter=...[origin/development])
- [ ] **T6** — Create `commitlint.config.ts` (conventional commits, subject-case disabled)
- [ ] **T7** — Update `CLAUDE.md` (Git Hooks section + --no-verify policy)
- [ ] **T8** — End-to-end verification (typecheck, lint, commitlint smoke tests)
