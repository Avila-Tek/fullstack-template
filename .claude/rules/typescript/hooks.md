---
paths:
  - "**/*.ts"
  - "**/*.js"
---
# TypeScript Hooks

> Extends [common/hooks.md](../common/hooks.md) with project-specific hook behavior.

## Active Hooks (from everything-claude-code plugin)

These run automatically — no configuration needed:

- **PreToolUse: Bash** — blocks dev server commands, reminds before `git push`
- **PreToolUse: Edit/Write** — warns about doc files, suggests context compaction at logical intervals
- **Stop** — audits modified files for `console.log`, writes session summary, tracks cost metrics
- **SessionStart** — loads prior session summary into context
- **PreCompact** — saves state before auto-compaction

## Linting and Formatting

This project uses **Biome**, not Prettier or ESLint. The linter runs via:
- `npx turbo lint` — check
- `npx turbo lint:fix` — auto-fix

No PostToolUse hook needed for formatting — run lint manually after a batch of edits, or at validation time.

## Console.log

The Stop hook audits all modified files for `console.log` after each response. Remove debug logs before committing.
