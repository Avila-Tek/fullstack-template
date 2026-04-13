# Plan: UI Component Enforcement Migration

**Spec**: `docs/specs/SPEC-ui-component-enforcement.md`  
**Branch**: `feat/ui-component-enforcement`  
**Date**: 2026-04-10

---

## Objective

Migrate all forbidden raw HTML tags in `apps/client` and `apps/admin` to their
`packages/ui` equivalents. Every interactive or visual element that has a shadcn
counterpart must use the component from `packages/ui`. Layout HTML (`<div>`,
`<section>`, `<form>`, `<main>`, `<nav>`, etc.) and `<span className="sr-only">`
accessibility spans are exempt.

---

## Assumptions

1. `packages/ui` already exports: `Alert`, `AlertDescription`, `AlertTitle`,
   `Button`, `Card` (+ sub-parts), `Form` (+ sub-parts), `Input`, `InputOtp`
   (+ sub-parts), `Label`, `Separator`.
2. `Typography`, `Spinner`, and `Avatar` are **not yet** in `packages/ui` and must
   be added before the relevant app files are touched.
3. `<span className="sr-only">` is an accessibility primitive — not a styled text
   atom — and is out of scope.
4. `<svg>` icons in `AdminLayout` (navigation icons) are out of scope; the spec
   does not enumerate SVG as a forbidden element.
5. Example pages (`app/examples/`) are in scope — they are deployed pages.
6. `app/global-error.tsx` in both apps is in scope — it is a rendered page.
7. Admin `AdminLoginPage` will be migrated in-place (logic is not restructured;
   only raw HTML tags are replaced with `@repo/ui` equivalents).

---

## Dependency graph

```
Phase 0 (packages/ui additions)
  └─ 0.1 Typography
  └─ 0.2 Spinner
  └─ 0.3 Avatar
       │
       ├─── Phase 1 (client / auth components)    ← needs Typography
       ├─── Phase 2 (client / auth widgets+layout) ← needs Typography
       ├─── Phase 3 (client / app pages)           ← needs Typography
       │
       ├─── Phase 4 (admin / app pages)            ← needs Typography
       ├─── Phase 5 (admin / AdminDashboardPage)   ← needs Typography
       ├─── Phase 6 (admin / AdminLayout)          ← needs Typography + Spinner + Avatar
       └─── Phase 7 (admin / AdminLoginPage)       ← needs Typography (Input/Button/Label already exist)
```

Phases 1–3 are independent of each other and can be executed in parallel.
Phases 4–7 are independent of each other and can be executed in parallel.
Phases 1–7 all depend on Phase 0.

---

## Complete violation inventory

### packages/ui — components to add (Phase 0)

| Component | Why needed |
|---|---|
| `Typography` | All `<h1>`–`<h3>`, `<p>`, and styled `<span>` replacements across both apps |
| `Spinner` | `AdminLayout` loading spinner (`<div className="animate-spin …">`) |
| `Avatar` | `AdminLayout` user avatar (`<div className="w-8 h-8 rounded-full …">`) |

### apps/client — auth feature components (Phase 1)

| File | Line(s) | Tag(s) | Replacement |
|---|---|---|---|
| `features/auth/ui/components/AuthHeader.tsx` | 20, 24 | `<h1>`, `<p>` | `<Typography>` |
| `features/auth/ui/components/AuthDivider.tsx` | 19 | `<span>` styled | `<Typography>` (small/muted) |
| `features/auth/ui/components/CheckEmailStatus.tsx` | 34, 37, 49 | `<h3>`, `<p>`, `<p>` | `<Typography>` |
| `features/auth/ui/components/PasswordInput.tsx` | 90 | `<p>` | `<Typography>` |
| `features/auth/ui/components/StatusDisplay.tsx` | 49 | `<p>` | `<Typography>` |
| `features/auth/ui/components/SignUpFormContent.tsx` | 188 | `<p>` | `<Typography>` |
| `features/auth/ui/components/VerifyingStatus.tsx` | 15 | `<p>` | `<Typography>` |
| `features/auth/ui/components/VerifySuccessStatus.tsx` | 27 | `<p>` | `<Typography>` |
| `features/auth/ui/components/ResetPasswordFormContent.tsx` | 36 | `<p>` | `<Typography>` |
| `features/auth/ui/components/ForgotPasswordFormContent.tsx` | 31 | `<p>` | `<Typography>` |
| `features/auth/ui/components/VerifyErrorStatus.tsx` | 34, 37 | `<h3>`, `<p>` | `<Typography>` |
| `features/auth/ui/components/LoadingButton.tsx` | 40 | `<span>` | Verify: if purely structural wrapper inside `<Button>`, leave; if styled atom, replace with `<Typography>` |

### apps/client — auth feature widgets + layout (Phase 2)

| File | Line(s) | Tag(s) | Replacement |
|---|---|---|---|
| `features/auth/ui/layouts/AuthLayout.tsx` | 28 | `<p>` (copyright) | `<Typography>` |
| `features/auth/ui/widgets/ForgotPasswordForm.tsx` | 85, 88 | `<h3>`, `<p>` | `<Typography>` |
| `features/auth/ui/widgets/LoginForm.tsx` | 53 | `<p>` | `<Typography>` |
| `features/auth/ui/widgets/ResetPasswordForm.tsx` | 73 | `<p>` | `<Typography>` |
| `features/auth/ui/widgets/OtpVerificationForm.tsx` | 63, 66 | `<h3>`, `<p>` | `<Typography>` |
| `features/auth/ui/widgets/SignUpForm.tsx` | 76 | `<p>` | `<Typography>` |

### apps/client — app pages (Phase 3)

| File | Line(s) | Tag(s) | Replacement |
|---|---|---|---|
| `app/page.tsx` | 7 | `<h1>` | `<Typography>` |
| `app/global-error.tsx` | 20 | `<h1>` | `<Typography>` |
| `app/examples/sentry-example-page/page.tsx` | 46, 48, 66, 87, 91, 94 | `<h1>`, `<p>`, `<button>`, `<span>`, `<p>`, `<p>` | `<Typography>`, `<Button>` |

### apps/admin — app pages (Phase 4)

| File | Line(s) | Tag(s) | Replacement |
|---|---|---|---|
| `app/global-error.tsx` | 20 | `<h1>` | `<Typography>` |
| `app/examples/sentry-example-page/page.tsx` | 46, 48, 66, 87, 91, 94 | `<h1>`, `<p>`, `<button>`, `<span>`, `<p>`, `<p>` | `<Typography>`, `<Button>` |
| `app/examples/users/users-query.tsx` | 17 | `<p>` | `<Typography>` |
| `app/examples/users/page.tsx` | 18 | `<p>` | `<Typography>` |

### apps/admin — AdminDashboardPage (Phase 5)

| File | Line(s) | Tag(s) | Replacement |
|---|---|---|---|
| `features/admin/ui/pages/AdminDashboardPage.tsx` | 19, 22 | `<h1>`, `<p>` | `<Typography>` |

### apps/admin — AdminLayout (Phase 6)

| Line(s) | Tag(s) | Replacement |
|---|---|---|
| 34–37 | `<div className="animate-spin …">` spinner | `<Spinner>` |
| 49 | `<h1>` sidebar title | `<Typography>` |
| 50 | `<p>` sidebar subtitle | `<Typography>` |
| 56, 80, 104, 128, 166 | `<a href="…">` ×5 (nav links + sign-out) | Next.js `<Link>` |
| 156 | `<div className="…rounded-full…">` avatar | `<Avatar>` / `<AvatarFallback>` |
| 160, 163 | `<p>` ×2 (user name, user email) | `<Typography>` |

### apps/admin — AdminLoginPage (Phase 7)

| Line(s) | Tag(s) | Replacement |
|---|---|---|
| 83 | `<h1>` page title | `<Typography>` |
| 84 | `<p>` subtitle | `<Typography>` |
| 90–93 | `<div>` error alert | `<Alert>` + `<AlertDescription>` |
| 96–100 | `<label htmlFor="email">` | `<FormLabel>` (inside `<FormItem>`) |
| 102–109 | `<input type="email" …register(…)>` | `<FormControl>` + `<Input>` (inside `<FormField>`) |
| 111–113 | `<p>` field error | `<FormMessage>` |
| 118–122 | `<label htmlFor="password">` | `<FormLabel>` |
| 124–131 | `<input type="password" …register(…)>` | `<FormControl>` + `<Input>` |
| 133–135 | `<p>` field error | `<FormMessage>` |
| 139–145 | `<button type="submit">` | `<Button type="submit">` |
| 150–159 | `<p>` + `<a href="…">` | `<Typography>` + Next.js `<Link>` |

Note: the existing `useForm` with `register()` must be converted to `<Form>` +
`<FormField>` + `useForm` with `control` prop, following the `@repo/ui` form
pattern (same as `apps/client` auth forms).

---

## Phase details

### Phase 0 — Add missing components to packages/ui

Run each from the repo root:

```bash
npx shadcn@latest add typography --cwd packages/ui
npx shadcn@latest add spinner --cwd packages/ui
npx shadcn@latest add avatar --cwd packages/ui
```

**Acceptance criteria**:
- Each component is importable via `@repo/ui/components/<name>`
- `npx turbo typecheck --filter @repo/ui` passes
- `npx turbo lint --filter @repo/ui` passes

---

### Phase 1 — Client: auth feature components

Replace every violation listed in the Phase 1 inventory table with `<Typography>`
from `@repo/ui`. Preserve all Tailwind classes by passing them as the `className`
prop on `<Typography>`.

**Acceptance criteria per file**:
- Zero raw `<h1>`–`<h6>`, `<p>`, or styled `<span>` remain
- `<span className="sr-only">` left unchanged
- Existing visual output is identical

---

### Phase 2 — Client: auth feature widgets + layout

Same migration pattern as Phase 1 across the widget and layout layer.

**Acceptance criteria**:
- Zero raw typography tags in `features/auth/ui/widgets/` and
  `features/auth/ui/layouts/`

---

### Phase 3 — Client: app pages

Migrate `app/page.tsx`, `app/global-error.tsx`, and example pages.

**Acceptance criteria**:
- Zero violations in `apps/client/src/app/`
- `app/global-error.tsx` still fulfills the Next.js error boundary contract
  (exports a default component with `error` + `reset` props)

---

**Checkpoint A** — after Phases 1–3:

```bash
npx turbo typecheck --filter @repo/client
npx turbo lint --filter @repo/client
npm -C apps/client test
```

All must pass before proceeding to admin phases.

---

### Phase 4 — Admin: app pages

Migrate `app/global-error.tsx`, `app/examples/sentry-example-page/page.tsx`,
`app/examples/users/page.tsx`, and `app/examples/users/users-query.tsx`.

---

### Phase 5 — Admin: AdminDashboardPage

Replace `<h1>` and `<p>` with `<Typography>`.

---

### Phase 6 — Admin: AdminLayout

In addition to `<Typography>` replacements:
- Replace all five `<a href="…">` with Next.js `<Link href="…">`
- Replace loading spinner `<div>` with `<Spinner>`
- Replace user avatar `<div>` with `<Avatar>` + `<AvatarFallback>` displaying the
  first character of `user?.firstName` or `user?.email`

---

### Phase 7 — Admin: AdminLoginPage

This is the most complex phase. The existing form uses `register()` directly on
raw inputs; it must be converted to the standard `<Form>` pattern:

```
useForm({ control }) → <Form> → <FormField control={…}> → <FormItem>
  → <FormLabel> + <FormControl><Input /></FormControl> + <FormMessage>
```

Steps:
1. Add `control` destructuring alongside the existing `handleSubmit`, `formState`
2. Wrap the form body in `<Form>` (takes the `form` object returned by `useForm`)
3. Replace each `<label>` + `<input>` + `<p className="text-red-…">` group with
   a `<FormField>` block
4. Replace submit `<button>` with `<Button type="submit">`
5. Replace top-level error `<div>` with `<Alert><AlertDescription>`
6. Replace `<h1>`, `<p>` with `<Typography>`
7. Replace `<a href="…">` with Next.js `<Link>`

---

**Checkpoint B** — after Phases 4–7:

```bash
npx turbo typecheck --filter @repo/admin
npx turbo lint --filter @repo/admin
npm -C apps/admin test
```

---

### Final verification

```bash
npx turbo typecheck
npx turbo lint
npx turbo test
```

Zero errors. Zero violations remain (verify with the grep command below):

```bash
# Should return no results inside feature/app UI files
grep -rn "<h[1-6]\|<p \|<p>\|<span[^>]*class\|<input\|<button\|<label\|<textarea\|<select\|<a " \
  apps/client/src/features apps/client/src/app \
  apps/admin/src/features apps/admin/src/app \
  --include="*.tsx" \
  | grep -v "sr-only\|examples/\|global-error\|\.test\.\|test-utils"
```

*(Adjust exclusions if example pages are addressed in their phases.)*

---

## Out of scope

- `<svg>` icons in `AdminLayout` navigation — not listed in the spec as forbidden
- `packages/ui` internal implementation (components already installed by shadcn)
- Test files (`*.test.tsx`, `test-utils/`)
- Restructuring `AdminLoginPage` into a separate widget file (only HTML is migrated)
- Any app file not listed in this plan
