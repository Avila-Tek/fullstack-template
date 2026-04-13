# TODO: UI Component Enforcement Migration

**Plan**: `docs/plans/ui-component-enforcement-plan.md`  
**Spec**: `docs/specs/SPEC-ui-component-enforcement.md`

---

## Phase 0 — Add missing components to packages/ui

- [ ] **0.1** Add `Typography` — `npx shadcn@latest add typography --cwd packages/ui`
- [ ] **0.2** Add `Spinner` — `npx shadcn@latest add spinner --cwd packages/ui`
- [ ] **0.3** Add `Avatar` — `npx shadcn@latest add avatar --cwd packages/ui`
- [ ] **0.4** Verify: `npx turbo typecheck --filter @repo/ui` passes
- [ ] **0.5** Verify: `npx turbo lint --filter @repo/ui` passes

---

## Phase 1 — Client: auth feature components

- [ ] **1.01** `AuthHeader.tsx` — replace `<h1>` (L20), `<p>` (L24) with `<Typography>`
- [ ] **1.02** `AuthDivider.tsx` — replace styled `<span>` (L19) with `<Typography>`
- [ ] **1.03** `CheckEmailStatus.tsx` — replace `<h3>` (L34), `<p>` (L37), `<p>` (L49) with `<Typography>`
- [ ] **1.04** `PasswordInput.tsx` — replace `<p>` (L90) with `<Typography>`; leave `<span className="sr-only">` (L72) as-is
- [ ] **1.05** `StatusDisplay.tsx` — replace `<p>` (L49) with `<Typography>`
- [ ] **1.06** `SignUpFormContent.tsx` — replace `<p>` (L188) with `<Typography>`
- [ ] **1.07** `VerifyingStatus.tsx` — replace `<p>` (L15) with `<Typography>`
- [ ] **1.08** `VerifySuccessStatus.tsx` — replace `<p>` (L27) with `<Typography>`
- [ ] **1.09** `ResetPasswordFormContent.tsx` — replace `<p>` (L36) with `<Typography>`
- [ ] **1.10** `ForgotPasswordFormContent.tsx` — replace `<p>` (L31) with `<Typography>`
- [ ] **1.11** `VerifyErrorStatus.tsx` — replace `<h3>` (L34), `<p>` (L37) with `<Typography>`
- [ ] **1.12** `LoadingButton.tsx` — verify `<span>` (L40): if structural wrapper inside `<Button>`, leave; if styled atom, replace with `<Typography>`

---

## Phase 2 — Client: auth feature widgets + layout

- [ ] **2.01** `AuthLayout.tsx` — replace `<p>` (L28, copyright) with `<Typography>`
- [ ] **2.02** `ForgotPasswordForm.tsx` — replace `<h3>` (L85), `<p>` (L88) with `<Typography>`
- [ ] **2.03** `LoginForm.tsx` — replace `<p>` (L53) with `<Typography>`
- [ ] **2.04** `ResetPasswordForm.tsx` — replace `<p>` (L73) with `<Typography>`
- [ ] **2.05** `OtpVerificationForm.tsx` — replace `<h3>` (L63), `<p>` (L66) with `<Typography>`
- [ ] **2.06** `SignUpForm.tsx` — replace `<p>` (L76) with `<Typography>`

---

## Phase 3 — Client: app pages

- [ ] **3.01** `app/page.tsx` — replace `<h1>` (L7) with `<Typography>`
- [ ] **3.02** `app/global-error.tsx` — replace `<h1>` (L20) with `<Typography>`
- [ ] **3.03** `app/examples/sentry-example-page/page.tsx` — replace `<h1>` (L46), `<p>` (L48), `<button>` (L66), `<span>` (L87), `<p>` (L91), `<p>` (L94) with `<Typography>` / `<Button>`

---

## Checkpoint A — client passes

- [ ] `npx turbo typecheck --filter @repo/client` — zero errors
- [ ] `npx turbo lint --filter @repo/client` — zero errors
- [ ] `npm -C apps/client test` — all tests pass

---

## Phase 4 — Admin: app pages

- [ ] **4.01** `app/global-error.tsx` — replace `<h1>` (L20) with `<Typography>`
- [ ] **4.02** `app/examples/sentry-example-page/page.tsx` — replace `<h1>`, `<p>`, `<button>`, `<span>`, `<p>`, `<p>` with `<Typography>` / `<Button>`
- [ ] **4.03** `app/examples/users/users-query.tsx` — replace `<p>` (L17) with `<Typography>`
- [ ] **4.04** `app/examples/users/page.tsx` — replace `<p>` (L18) with `<Typography>`

---

## Phase 5 — Admin: AdminDashboardPage

- [ ] **5.01** `features/admin/ui/pages/AdminDashboardPage.tsx` — replace `<h1>` (L19), `<p>` (L22) with `<Typography>`

---

## Phase 6 — Admin: AdminLayout

- [ ] **6.01** Replace loading spinner `<div className="animate-spin …">` (L34–37) with `<Spinner>`
- [ ] **6.02** Replace `<h1>` (L49) sidebar title with `<Typography>`
- [ ] **6.03** Replace `<p>` (L50) sidebar subtitle with `<Typography>`
- [ ] **6.04** Replace `<a href="/admin/dashboard">` (L56) with `<Link href="…">`
- [ ] **6.05** Replace `<a href="/admin/users">` (L80) with `<Link href="…">`
- [ ] **6.06** Replace `<a href="/admin/plans">` (L104) with `<Link href="…">`
- [ ] **6.07** Replace `<a href="/admin/roles">` (L128) with `<Link href="…">`
- [ ] **6.08** Replace sign-out `<a href="/">` (L166) with `<Link href="/">`
- [ ] **6.09** Replace user avatar `<div className="…rounded-full…">` (L156) with `<Avatar>` + `<AvatarFallback>`
- [ ] **6.10** Replace `<p>` user name (L160) with `<Typography>`
- [ ] **6.11** Replace `<p>` user email (L163) with `<Typography>`

---

## Phase 7 — Admin: AdminLoginPage (form refactor)

- [ ] **7.01** Destructure `control` from `useForm` alongside existing `register`, `handleSubmit`, `formState`
- [ ] **7.02** Wrap form body in `<Form form={form}>` from `@repo/ui`
- [ ] **7.03** Replace top-level error `<div>` (L90–93) with `<Alert><AlertDescription>`
- [ ] **7.04** Replace email `<label>` + `<input>` + `<p>` error (L96–114) with `<FormField>` → `<FormItem>` → `<FormLabel>` + `<FormControl><Input /></FormControl>` + `<FormMessage>`
- [ ] **7.05** Replace password `<label>` + `<input>` + `<p>` error (L118–136) with `<FormField>` → `<FormItem>` → `<FormLabel>` + `<FormControl><Input type="password" /></FormControl>` + `<FormMessage>`
- [ ] **7.06** Replace `<button type="submit">` (L139) with `<Button type="submit">`
- [ ] **7.07** Replace `<h1>` (L83) with `<Typography>`
- [ ] **7.08** Replace `<p>` subtitle (L84) with `<Typography>`
- [ ] **7.09** Replace `<p>` footer text (L150) with `<Typography>`
- [ ] **7.10** Replace `<a href="…">` (L152) with Next.js `<Link href="…">`

---

## Checkpoint B — admin passes

- [ ] `npx turbo typecheck --filter @repo/admin` — zero errors
- [ ] `npx turbo lint --filter @repo/admin` — zero errors
- [ ] `npm -C apps/admin test` — all tests pass

---

## Final verification

- [ ] `npx turbo typecheck` — zero errors across all packages
- [ ] `npx turbo lint` — zero errors
- [ ] `npx turbo test` — all tests pass
- [ ] Grep check returns no remaining violations:
  ```bash
  grep -rn "<h[1-6]\|<p \|<p>\|<input\|<button\|<label\|<textarea\|<select\|<a " \
    apps/client/src/features apps/client/src/app \
    apps/admin/src/features apps/admin/src/app \
    --include="*.tsx" \
    | grep -v "sr-only\|\.test\.\|test-utils"
  ```
- [ ] Update `docs/specs/SPEC-ui-component-enforcement.md` violations section to reflect "all resolved"
