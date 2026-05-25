# Auth Integration — Task Checklist

> Full plan: `docs/auth/plan.md` | Spec: `docs/auth/spec.md`

---

## Phase 0 — Packages

- [ ] **Task 0.1** — Rename `@zoom/utils` → `@repo/utils` (`packages/utils/package.json`)
- [ ] **Task 0.2** — Rename `@zoom/swagger` → `@repo/swagger` (`packages/schemas/src/swagger/package.json`)
- [ ] **Task 0.3** — Add `export * from './http'` to `packages/schemas/src/index.ts`
- [ ] **Task 0.4** — Global search-replace `@zoom/*` → `@repo/*` across repo

### ✅ Checkpoint 0
- [ ] `npx turbo typecheck --filter @repo/utils --filter @repo/schemas --filter @repo/swagger` passes
- [ ] Zero `@zoom/*` import references in repo

---

## Phase 1 — Delete Zoom artifacts

- [ ] **Task 1.1** — Install deps: `better-auth`, `@thallesp/nestjs-better-auth`, `ioredis`, `postmark`, `@sentry/nestjs`, `@sentry/node`
- [ ] **Task 1.2** — Delete Zoom-specific infra dirs/files (`sms/`, `zoom/`, `system-key/`, 3 guards, 4 HTTP controllers)
- [ ] **Task 1.3** — Delete Zoom-specific DB schemas (8 system/org/terms schema files) + clean `db-schema.ts`
- [ ] **Task 1.4** — Delete Zoom-specific use cases + ports + domain entities (~25 files)

### ✅ Checkpoint 1
- [ ] `grep -r "@zoom/" apps/api/src/` → zero matches
- [ ] No system/org/terms/SMS files remain
- [ ] Human review ✋

---

## Phase 2 — Adapt auth core

- [ ] **Task 2.1** — Create `postmark-email.adapter.ts`, delete `zoom-email.adapter.ts`, update module binding
- [ ] **Task 2.2** — Adapt `auth.ts`: remove `organization()` plugin, `OAuthSystemContextStore`, `systemId`
- [ ] **Task 2.3** — Create `instrument.ts`, replace `env.ts` with clean Zod schema (spec §10)
- [ ] **Task 2.4** — Adapt `admin-bearer.guard.ts` (→ `super_admin`) + `session.guard.ts` (remove org refs)
- [ ] **Task 2.5** — Adapt Swagger docs module: remove `x-system-key`, simplify servers

### ✅ Checkpoint 2
- [ ] `npx turbo typecheck --filter @app/api` passes (auth module)
- [ ] No Zoom email / org plugin / system-key references in auth
- [ ] Human review ✋

---

## Phase 3 — Shared guards + RBAC

- [ ] **Task 3.1** — Create shared guards: `JwtAuthGuard`, `PermissionsGuard`, `@Public`, `@CurrentUser`, `@RequirePermissions`, `@CurrentPermissions`
- [ ] **Task 3.2** — Create `RbacModule` with domain entities, Drizzle schemas, repository, `PermissionResolver`
- [ ] **Task 3.3** — Create RBAC DB migration + seed (`super_admin`, `admin`, `viewer`)

### ✅ Checkpoint 3
- [ ] `npx turbo typecheck --filter @app/api` passes
- [ ] RBAC seed runs successfully
- [ ] Human review ✋

---

## Phase 4 — Support modules cleanup

- [ ] **Task 4.1** — Adapt `users/` module: fix imports, DTOs, reference ProfilesModule, use shared `@CurrentUser`
- [ ] **Task 4.2** — Adapt `profiles/` module: delete Zoom permission resolver, locker-reader, 3 Zoom schemas, fix imports
- [ ] **Task 4.3** — Adapt `role-templates/` module: delete 3 business-profile schemas, fix import paths

### ✅ Checkpoint 4
- [ ] `npx turbo typecheck --filter @app/api` passes — zero errors
- [ ] Zero `@zoom/*` references in `apps/api/src/`
- [ ] Human review ✋

---

## Phase 5 — Wiring

- [ ] **Task 5.1** — Rewrite `AppModule` with full spec §9 wiring (guards, filters, interceptors, middleware)
- [ ] **Task 5.2** — Update `main.ts`: `instrument.ts` first import, remove Zoom refs, register `CorrelationIdMiddleware`

### ✅ Checkpoint 5
- [ ] `npx turbo typecheck` → zero errors (full repo)
- [ ] `npx turbo lint` passes
- [ ] App starts locally without errors
- [ ] Human review ✋

---

## Phase 6 — Tests

- [ ] **Task 6.1** — Unit tests: `PermissionResolver`, BruteForce, `sign-in.hooks`
- [ ] **Task 6.2** — Integration test: sign-up → verify → sign-in → sign-out flow
- [ ] **Task 6.3** — Guard tests: `@Public` bypass, 401 without token, 403 with insufficient role

### ✅ Checkpoint 6
- [ ] `npx turbo test --filter @app/api` → all pass
- [ ] Human review ✋

---

## Phase 7 — Dead code purge

- [ ] **Task 7.1** — TypeScript dead code analysis, remove orphaned files, ports, env vars, Zoom-origin symbols

### ✅ Checkpoint 7 — Final
- [ ] `npx turbo typecheck` passes
- [ ] `npx turbo lint` passes
- [ ] `npx turbo test --filter @app/api` passes
- [ ] `grep -rn "@zoom/" .` → zero matches
- [ ] All spec §11 acceptance criteria checked ✔
