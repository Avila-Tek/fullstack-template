# Development Workflow

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process before git operations.

## Feature Implementation Workflow

0. **Research & Reuse** _(before any new implementation)_
   - Check if the pattern already exists in this monorepo's `packages/*`
   - Search npm for battle-tested libraries before writing utility code
   - Follow existing patterns in `apps/client`, `apps/auth`, `apps/api` rather than inventing new ones

1. **Plan First**
   - Use **planner** agent for any feature touching 3+ files or with unclear scope
   - Identify which apps and packages are affected
   - Determine if new code belongs in `apps/*` or `packages/*`
   - Break down into phases; get user confirmation before coding

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED) — use Vitest + Angular TestBed for components
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Validate**
   - `npx turbo typecheck`
   - `npx turbo lint` (fix with `npx turbo lint:fix` if needed)
   - `npx turbo test --filter @repo/<package>` (when applicable)
   - Never start a dev server

4. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues before committing
   - For auth / API changes also use **security-reviewer**

5. **Commit & Push**
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for format and PR process
