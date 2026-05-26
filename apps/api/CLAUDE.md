# Claude Operating Guide (Lean)

You are a pragmatic senior engineer. Prefer small, verifiable changes. Avoid over-engineering.

## Non-negotiables
- TDD: write a failing test first for new behavior.
- For any non-trivial task: Research → Plan → Implement → Verify.
- If requirements are unclear, STOP and ask. Don't guess.

## Context & cost control
- Keep only the minimum files in context to do the next step.
- After finishing a phase, summarize progress into the active plan doc, then `/clear`.
- Default output: short. No essays unless asked.

## Where rules live (read only when needed)
- Testing by layer: `docs/agent/TESTING.md`
- Workflow & git conventions: `docs/agent/WORKFLOW.md`
- Code Style: `docs/agent/CODE_STYLE.md`

## Commands
Run from repo root unless noted.

- Unit tests: `npm test` (turbo test)
- Lint: `npm run lint` (turbo lint)
- Format check/fix (when touching lots of files):
  - check: `npm run format-and-lint` (biome check)
  - fix: `npm run format:fix` (biome format --write)
    API-specific (apps/api):
- Typecheck: `npm -C apps/api run check:types` (tsc --noEmit)
- Tests only for API: `npm -C apps/api test` (vitest)

## Response style (cost control)
- Default: concise.
- Plans: bullet list of steps + files + tests. No long explanations.
- Implementation: show only changed files/patches; avoid repeating unchanged code.
- Don't restate rules unless asked. Apply them silently.

---

# Architecture Standard

> Applies to all new code. Existing CQRS/QueryBus code is legacy — migrate in a future sprint.

## Module layout

```
{module}/
  application/
    ports/
      in/           ← input ports (use-case interfaces)
      out/          ← output ports (repo/service contracts)
        facades/    ← facade ports this module exposes to others
    use-cases/
  domain/
    entities/
    value-objects/
    events/         ← plain TS classes, zero framework imports
  infrastructure/
    persistence/
    web/
    facades/        ← facade adapters
  module.ts
```

- `domain/` → zero framework imports.
- `application/` → zero imports from `infrastructure/` or other modules.
- `module.ts` → exports only input ports and facade ports.

## Cross-module communication — Facade ports

Never export a repository port to another module. Export a thin **facade port** instead.

```ts
// ✅ profiles/application/ports/out/facades/profile-facade.port.ts
export abstract class ProfileFacadePort {
  abstract getById(id: string): Promise<{ id: string; name: string } | null>;
}

// ✅ profiles/module.ts
exports: [ProfileFacadePort] // ← never BusinessProfileRepositoryPort
```

Naming: `{Entity}FacadePort` / `{Entity}FacadeAdapter` / `{entity}-facade.port.ts`.
Return types must be plain objects, never domain entity instances.

## Side-effects — EventEmitter2

Never import another module's service to trigger a side-effect. Emit a domain event instead.

```ts
// use case — emit
this.eventEmitter.emit('invitation.created', new InvitationCreatedEvent(...));

// email module — listen
@OnEvent('invitation.created')
async handle(event: InvitationCreatedEvent) { ... }
```

- Event naming: `{entity}.{past-tense-verb}` (e.g. `user.registered`, `member.deactivated`).
- Event classes → `domain/events/` of the emitting module.
- Listeners → `infrastructure/listeners/` of the consuming module.
- Fire-and-forget (`emit`, not `emitAsync`) unless consistency requires otherwise.

## What a module may export

| ✅ | ❌ |
|---|---|
| Input ports | Repository ports |
| Facade ports | Domain entities |
| Plain DTOs | Use-case implementations |

## New module checklist

- [ ] `domain/` has no framework imports
- [ ] `application/` has no imports from `infrastructure/`
- [ ] Cross-module data → `*FacadePort`, not a repo port
- [ ] Side-effects → `EventEmitter2`, not direct service imports
- [ ] `module.ts` exports only ports and facades
- [ ] No `QueryBus.execute()` for cross-module calls
