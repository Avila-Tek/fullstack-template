# API Architecture & Module Boundaries

## Module Dependency Hierarchy

Allowed dependency directions (downstream → upstream):

```
auth       → user
user       → (no dependencies)
profiles   → (no dependencies)
members    → profiles, email
invitations → region, profiles, email
recipients  → profiles, region
```

No circular dependencies are allowed. If you think you need one, introduce a shared domain event instead.

---

## Inter-Module Communication Rules

### 1. No CQRS buses across module boundaries

`CommandBus` and `QueryBus` are for intra-module use only — they wire use-cases within the same NestJS module. Do not use them to call into another module.

**Wrong:**
```ts
// Inside InvitationUseCase — crossing into ProfilesModule via bus
const profile = await this.queryBus.execute(new GetProfileByAccountIdQuery(accountId));
```

**Right:**
```ts
// Inject a facade port; the adapter is provided by ProfilesModule
const profile = await this.profileFacade.getByAccountId(accountId);
```

### 2. Export Application Facade ports, not repository ports

A module must never export its `*RepositoryPort` or any persistence-layer abstraction to other modules. Consumers must not depend on another module's data-access shape.

Instead, export a thin **Application Facade port** that exposes only the minimal contract other modules actually need:

```ts
// profiles/application/ports/out/profile-facade.port.ts
export abstract class ProfileFacadePort {
  abstract getById(id: string): Promise<{ id: string; name: string; email: string } | null>;
  abstract getByAccountId(accountId: string): Promise<{ id: string; name: string } | null>;
}
```

`ProfilesModule` provides a concrete adapter that calls its own internal repository. Downstream modules (`members`, `invitations`, `recipients`) only inject `ProfileFacadePort` — they are insulated from schema changes.

**Modules that currently need a facade:** `profiles` (highest priority — it is the main gravity well).  
`region` and `email` are already close to pure ports and are acceptable as-is.

### 3. Use EventEmitter2 for side-effects, not direct module imports

Fire-and-forget side-effects (emails, notifications, audit logs, webhooks) must not be wired as direct use-case dependencies. Use `@nestjs/event-emitter` instead:

```ts
// invitation.use-case.ts — emit after the state change is committed
this.eventEmitter.emit('invitation.created', new InvitationCreatedEvent(invite));
```

```ts
// email/listeners/invitation.listener.ts
@OnEvent('invitation.created')
async sendInvitationEmail(event: InvitationCreatedEvent) { ... }
```

This means `InvitationsModule` has zero import of `EmailModule`. The same pattern absorbs future notifications, webhooks, and audit logs without touching business use-cases.

**Required for any new side-effect.** Existing `.then().catch()` wiring in use-cases should be migrated incrementally.

---

## What to Export from a Module

| Allowed | Not allowed |
|---|---|
| Application Facade ports (`*FacadePort`) | Repository ports (`*RepositoryPort`) |
| Domain events (`*Event` classes) | ORM schemas / Drizzle table definitions |
| Abstract service ports the module owns | Concrete adapters / service implementations |

---

## Layering Within a Module

```
infrastructure/web/        ← controllers (HTTP in)
infrastructure/persistence/ ← repository adapters (DB out)
infrastructure/services/    ← external service adapters (email, etc.)
application/use-case/       ← orchestration, no framework deps
application/ports/in/       ← use-case input contracts
application/ports/out/      ← abstract output ports (repo, facade, services)
domain/entities/            ← aggregates, value objects, domain events
domain/policies/            ← pure business rules
```

Controllers call use-cases. Use-cases depend only on ports (abstract classes). Adapters are wired via NestJS DI in the module definition.

---

## Checklist for New Cross-Module Interactions

Before adding a dependency from module A to module B:

- [ ] Does A really need B, or can a domain event decouple them?
- [ ] If A needs data from B: does B expose a `*FacadePort`? If not, create one before proceeding.
- [ ] Is the dependency direction allowed per the hierarchy above?
- [ ] Are you injecting an abstract port (not a concrete class)?
- [ ] Is the exported contract minimal (only what A actually uses)?
