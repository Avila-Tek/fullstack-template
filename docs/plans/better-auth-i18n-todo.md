# Todo: Better Auth i18n Integration

**Plan:** `docs/plans/better-auth-i18n-plan.md`
**Spec:** `docs/specs/better-auth-i18n-integration.md`

---

## Phase 1: Foundation

- [x] **T1** — Install `@better-auth/i18n` in `apps/api`
- [x] **T2** — Create Spanish translation catalog (`i18n/translations.ts` + `i18n/index.ts`)

### Checkpoint 1
- [x] Package installed, no conflicts
- [x] Catalog covers all "must translate" + "should translate" keys
- [x] `npx turbo typecheck --filter @repo/api` passes

## Phase 2: Wiring

- [x] **T3** — Wire `i18n()` plugin into `auth.ts` (import + add to plugins array)

### Checkpoint 2
- [x] Diff is minimal (only i18n addition)
- [x] No changes to filters, hooks, or controllers
- [x] Source files pass typecheck
- [x] Changed files pass lint

## Phase 3: Testing

- [x] **T4** — Unit test: catalog completeness (`translations.spec.ts`)
- [x] **T5** — Integration test: plugin configuration (`i18n-integration.spec.ts`)

### Checkpoint 3
- [x] All new tests pass (11 new tests)
- [x] No existing tests broken (92/92 pass)

## Phase 4: Validation

- [x] **T6** — Full validation: typecheck + lint + all tests + diff review

### Final Checklist (Spec Acceptance Criteria)
- [x] AC-1: `@better-auth/i18n` in `package.json`
- [x] AC-4: All "must translate" codes have `es` translations
- [x] AC-7: Domain exceptions unchanged
- [x] AC-8: Typecheck passes (source files)
- [x] AC-9: Lint passes (changed files)
- [x] AC-10: Translation catalog unit test passes
- [ ] AC-2/3/5/6: Localized responses verified (requires running server — manual verification)
