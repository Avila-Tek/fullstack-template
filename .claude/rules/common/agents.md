# Agent Orchestration

## Available Agents

Located in `.claude/agents/`:

| Agent | Purpose | When to Use |
|---|---|---|
| `planner` | Implementation planning | Any feature with 3+ files or unclear scope |
| `architect` | Package boundaries, system design | New package, cross-app concern, boundary decision |
| `tdd-guide` | Test-driven development | New features, bug fixes, refactoring |
| `code-reviewer` | Code quality + security review | After writing any non-trivial change |
| `security-reviewer` | Vulnerability analysis | New endpoint, guard, user-facing form, auth code |
| `build-error-resolver` | Fix typecheck / lint errors | When `npx turbo typecheck` or `npx turbo lint` fails |
| `e2e-runner` | Playwright E2E testing | New user flow or regression risk |
| `refactor-cleaner` | Dead code cleanup | Unused imports, exports, packages |
| `doc-updater` | Keep CLAUDE.md files accurate | After a feature changes conventions or structure |
| `database-reviewer` | SQL, schema, migrations | New migration, complex query, schema change |

## Proactive Delegation Rules

Delegate immediately — no user prompt needed:

1. Feature with 3+ files or unclear scope → **planner** first
2. New package or cross-app concern → **architect**
3. Writing new behavior → **tdd-guide**
4. Code just written or modified → **code-reviewer**
5. New API endpoint, guard, or user-facing form → **security-reviewer**
6. Build or typecheck failing → **build-error-resolver**

## Parallel Execution

For independent operations, launch agents in parallel — never sequentially when there are no dependencies between tasks.
