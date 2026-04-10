# CLAUDE.md (Monorepo Root)

Repo-wide rules for this Turborepo monorepo. Applies to `apps/*` and `packages/*`.

> If a subfolder has its own `CLAUDE.md`, the more specific rules take precedence.

---

## Repo structure

```
.
├── apps/
│   ├── client/         # Next.js app (end-user)
│   ├── admin/          # Next.js app (admin)
│   └── api/            # NestJS API
├── packages/
│   ├── ui/             # shadcn/ui components + Tailwind tokens
│   ├── schemas/        # Zod schemas + shared DTO types
│   ├── services/       # Shared HTTP clients built on schemas
│   ├── auth/           # Shared auth utilities (guards, tokens, session helpers)
│   ├── utils/          # Shared helpers (no framework coupling)
│   ├── feature-flags/  # PostHog feature flag wrappers
│   └── typescript-config/ # Shared tsconfig presets
├── biome.json
├── turbo.json
└── package.json
```

**Rule**: if code is used by 2+ apps, it belongs in `packages/*`. Keep apps thin.

---

## Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, React Query
- **Backend**: NestJS, TypeScript, Node ≥ 20, Drizzle ORM, Better Auth, Redis
- **Tooling**: Turborepo, npm workspaces, Biome, Vitest, Renovate

---

## Development cycle

1. Run typecheck + lint after every change:
   ```bash
   npx turbo typecheck
   npx turbo lint          # fix: npx turbo lint:fix
   ```
2. Run tests when applicable:
   ```bash
   npx turbo test --filter @repo/<package>
   ```
3. **Never** start a dev server or `curl` local endpoints.

---

## TypeScript conventions (all packages and apps)

- Prefer **interfaces** for object shapes; `type` for unions/mapped types.
- Public functions: **explicit return types**.
- Prefer **function declarations** and **named functions**.
- Prefer **async/await** over `.then()`.
- Use **Zod** for runtime validation at system boundaries.
- **Minimal comments** — only explain *why*, never *what*.

---

## Git Hooks

Three hooks are active on this repo (managed by Husky v9):

| Hook | Runs on | What it checks |
|---|---|---|
| `pre-commit` | `git commit` | Biome format+lint on staged files; full typecheck |
| `commit-msg` | `git commit` | Conventional commit message format |
| `pre-push` | `git push` | Tests for packages changed vs. `origin/development` |

Commit message format: `<type>[optional scope]: <description>`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Scope is optional and free-form: `fix(api): ...`, `feat(client): 🚀 ...`, `chore(all): ...`
- Description is free-form — emojis and any casing are allowed

**Never use `--no-verify`.** All hook checks are duplicated in CI — bypassing locally only delays the failure. If a hook blocks you, fix the underlying issue.

When adding a new commit scope, also add it to `.vscode/settings.json` → `conventionalCommits.scopes`.

---

## Where to look next

- **apps/client** → `apps/client/CLAUDE.md`
- **apps/admin** → `apps/admin/CLAUDE.md`
- **apps/api** → `apps/api/CLAUDE.md`
