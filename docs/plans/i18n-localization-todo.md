# TODO: Frontend Localization (i18n)

**Plan:** `docs/plans/i18n-localization-plan.md`  
**Spec:** `docs/specs/SPEC-i18n-localization.md`

---

## Phase 1 — i18n Infrastructure (both apps)

- [ ] **T1.1** Install `next-intl@^3` in `apps/client/package.json` and `apps/admin/package.json`
- [ ] **T1.2** Create `src/i18n/routing.ts` in apps/client (locales, defaultLocale, localePrefix: 'never')
- [ ] **T1.2** Create `src/i18n/routing.ts` in apps/admin (identical)
- [ ] **T1.3** Create `src/i18n/request.ts` in apps/client (getRequestConfig with dynamic auth + shared imports)
- [ ] **T1.3** Create `src/i18n/request.ts` in apps/admin (getRequestConfig with auth + admin + userManagement + shared)
- [ ] **T1.3** Update `next.config.ts` in apps/client with `withNextIntl` plugin
- [ ] **T1.3** Update `next.config.ts` in apps/admin with `withNextIntl` plugin
- [ ] **T1.4** Update `apps/client/middleware.ts` — compose `createIntlMiddleware(routing)` with existing auth logic
- [ ] **T1.4** Update `apps/admin/middleware.ts` — compose `createIntlMiddleware(routing)` with redirect logic; expand matcher
- [ ] **T1.5** Update `apps/client/src/app/layout.tsx` — add `NextIntlClientProvider`, `getLocale()`, `getMessages()`
- [ ] **T1.5** Update `apps/admin/src/app/layout.tsx` — same as client

> **CHECKPOINT 1:** `npx turbo typecheck && npx turbo lint` — both must pass before Phase 2

---

## Phase 2 — Translation Files: apps/client

- [ ] **T2.1** Create `apps/client/src/features/auth/i18n/es.ts` — full auth namespace (login, signUp, forgotPassword, resetPassword, verifyEmail, otp, callback, validation, password)
- [ ] **T2.2** Create `apps/client/src/features/auth/i18n/en.ts` — English equivalents, identical key shape, `satisfies typeof esAuth`
- [ ] **T2.3** Create `apps/client/src/shared/i18n/es.ts` — errors.generic, errors.network, metadata.defaultTitle, metadata.defaultDescription
- [ ] **T2.4** Create `apps/client/src/shared/i18n/en.ts` — English equivalents, identical key shape, `satisfies typeof esShared`
- [ ] **T2.5** Create `apps/client/src/i18n/types.d.ts` — global `IntlMessages` extending `{ auth: typeof authEn; shared: typeof sharedEn }`

---

## Phase 3 — Client App String Extraction

- [ ] **T3.1** Refactor `apps/client/src/features/auth/infrastructure/auth.form.ts` — replace inline Spanish strings with factory functions (`buildLoginSchema(t)`, `buildSignUpSchema(t)`, `buildForgotPasswordSchema(t)`, `buildResetPasswordSchema(t)`, `buildOtpSchema(t)`, `buildEmailCallbackSchema(t)`)
- [ ] **T3.2** Refactor `apps/client/src/features/auth/domain/auth.constants.ts` — remove `authTaglines` export; update `getRandomTagline(taglines: readonly string[]): string`
- [ ] **T3.3** Update `LoginForm.tsx` — `useTranslations('auth')`, factory schema, `t.raw('login.taglines')` for tagline
- [ ] **T3.3** Update `SignUpForm.tsx` — `useTranslations('auth')`, factory schema, taglines
- [ ] **T3.3** Update `ForgotPasswordForm.tsx` — `useTranslations('auth')`, factory schema, taglines
- [ ] **T3.3** Update `ResetPasswordForm.tsx` — `useTranslations('auth')`, factory schema
- [ ] **T3.3** Update `OtpVerificationForm.tsx` — `useTranslations('auth')`
- [ ] **T3.3** Update `VerifyEmailForm.tsx` — `useTranslations('auth')`, taglines
- [ ] **T3.3** Update `AuthCallbackHandler.tsx` — `useTranslations('auth')`
- [ ] **T3.4** Update `LoginFormContent.tsx` — labels, placeholders, submit button, forgot password link
- [ ] **T3.4** Update `SignUpFormContent.tsx` — all field labels, terms text, submit button
- [ ] **T3.4** Update `ForgotPasswordFormContent.tsx` — labels, buttons, email sent state
- [ ] **T3.4** Update `ResetPasswordFormContent.tsx` — labels, buttons
- [ ] **T3.4** Update `GoogleLoginButton.tsx` — button text
- [ ] **T3.4** Update `PasswordInput.tsx` — show/hide aria labels
- [ ] **T3.4** Update `CheckEmailStatus.tsx` — status messages
- [ ] **T3.4** Update `StatusDisplay.tsx` — status messages
- [ ] **T3.4** Update `VerifyErrorStatus.tsx`, `VerifySuccessStatus.tsx`, `VerifyingStatus.tsx` — all text
- [ ] **T3.4** Update remaining components with any hardcoded strings (`AuthHeader.tsx`, `FormError.tsx`, `FormSuccess.tsx`, `AuthDivider.tsx`, `OtpInput.tsx`, `LoadingButton.tsx`, `AuthCard.tsx`)
- [ ] **T3.5** Audit auth pages for any hardcoded strings (`LoginPage.tsx`, `SignUpPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `AuthCallbackPage.tsx`)
- [ ] **T3.6** Update `apps/client/src/app/layout.tsx` metadata — use `generateMetadata()` with `getTranslations('shared')`

> **CHECKPOINT 2:** `npx turbo typecheck --filter @repo/client && npx turbo lint --filter @repo/client`  
> Manual smoke test: set `NEXT_LOCALE=en` cookie → verify English text; remove → Spanish.

---

## Phase 4 — Translation Files: apps/admin

- [ ] **T4.1** Create `apps/admin/src/features/auth/i18n/es.ts` — login section + validation (per spec Section 8)
- [ ] **T4.1** Create `apps/admin/src/features/auth/i18n/en.ts` — English equivalents, `satisfies typeof esAuth`
- [ ] **T4.2** Create `apps/admin/src/features/admin/i18n/es.ts` — layout section (sidebar, nav) + dashboard section
- [ ] **T4.2** Create `apps/admin/src/features/admin/i18n/en.ts` — English equivalents
- [ ] **T4.3** Create `apps/admin/src/features/userManagement/i18n/es.ts` — errors.parsingParams
- [ ] **T4.3** Create `apps/admin/src/features/userManagement/i18n/en.ts` — English equivalents
- [ ] **T4.4** Create `apps/admin/src/shared/i18n/es.ts` — errors + metadata
- [ ] **T4.4** Create `apps/admin/src/shared/i18n/en.ts` — English equivalents
- [ ] **T4.5** Create `apps/admin/src/i18n/types.d.ts` — global `IntlMessages` with auth + admin + userManagement + shared

---

## Phase 5 — Admin App String Extraction

- [ ] **T5.1** Refactor `apps/admin/src/features/auth/infrastructure/auth.form.ts` — factory `buildLoginSchema(t)`
- [ ] **T5.2** Update `AdminLoginPage.tsx` — `useTranslations('auth')`, all hardcoded strings, factory schema
- [ ] **T5.3** Update `AdminDashboardPage.tsx` — `useTranslations('admin')`, heading + welcome with `{name}` interpolation
- [ ] **T5.4** Update `AdminLayout.tsx` — `useTranslations('admin')`, all sidebar + nav + logout strings

> **CHECKPOINT 3 (Final):** `npx turbo typecheck && npx turbo lint`  
> Write Vitest integration test for form factory in both apps.  
> Manual smoke test on admin app: `NEXT_LOCALE=en` cookie → English; remove → Spanish.

---

## Acceptance Criteria Checklist

- [ ] `next-intl` installed in both `apps/client` and `apps/admin`
- [ ] Locale detection: Spanish by default, English if `NEXT_LOCALE=en` cookie or `Accept-Language: en` header
- [ ] Every hardcoded user-facing string extracted into feature-level `i18n/en.ts` + `i18n/es.ts`
- [ ] Shared common strings in `shared/i18n/en.ts` + `shared/i18n/es.ts`
- [ ] TypeScript types declared — wrong/missing keys produce compile errors
- [ ] Zod validation messages translated via form factory function
- [ ] Taglines arrays moved from `auth.constants.ts` to i18n files
- [ ] `npx turbo typecheck` passes for both apps
- [ ] `npx turbo lint` passes for both apps
- [ ] No string added to both shared and feature namespace
- [ ] `en.ts` and `es.ts` have identical key shapes (enforced via `satisfies`)
- [ ] Vitest integration test for form factory passes
