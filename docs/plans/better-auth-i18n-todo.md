# Todo: Better Auth i18n Integration

**Plan:** `docs/plans/better-auth-i18n-plan.md`
**Spec:** `docs/specs/better-auth-i18n-integration.md`

---

## Phase 1: Foundation

- [ ] **T1** — Install `@better-auth/i18n` in `apps/api`
- [ ] **T2** — Create Spanish translation catalog (`i18n/translations.ts` + `i18n/index.ts`)

### Checkpoint 1
- [ ] Package installed, no conflicts
- [ ] Catalog covers all "must translate" + "should translate" keys
- [ ] `npx turbo typecheck --filter @repo/api` passes

## Phase 2: Wiring

- [ ] **T3** — Wire `i18n()` plugin into `auth.ts` (import + add to plugins array)

### Checkpoint 2
- [ ] Diff is minimal (only i18n addition)
- [ ] No changes to filters, hooks, or controllers
- [ ] `npx turbo typecheck --filter @repo/api` passes
- [ ] `npx turbo lint --filter @repo/api` passes

## Phase 3: Testing

- [ ] **T4** — Unit test: catalog completeness (`translations.spec.ts`)
- [ ] **T5** — Integration test: locale detection (`i18n-integration.spec.ts`)

### Checkpoint 3
- [ ] All new tests pass
- [ ] No existing tests broken

## Phase 4: Validation

- [ ] **T6** — Full validation: typecheck + lint + all tests + diff review

### Final Checklist (Spec Acceptance Criteria)
- [ ] AC-1: `@better-auth/i18n` in `package.json`
- [ ] AC-4: All "must translate" codes have `es` translations
- [ ] AC-7: Domain exceptions unchanged
- [ ] AC-8: Typecheck passes
- [ ] AC-9: Lint passes
- [ ] AC-10: Translation catalog unit test passes
- [ ] AC-2/3/5/6: Localized responses verified (integration test or manual)
