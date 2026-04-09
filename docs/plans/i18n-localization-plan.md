# Plan: Frontend Localization (i18n) — next-intl

**Spec:** `docs/specs/SPEC-i18n-localization.md`  
**Apps in scope:** `apps/client`, `apps/admin`  
**Languages:** Spanish (`es`, default) · English (`en`)  
**Date:** 2026-04-08

---

## Dependency Graph

```
next-intl installed
    └── i18n/routing.ts (locale constants)
            └── i18n/request.ts (message loader)
                    └── i18n/types.d.ts (type declarations)
                            └── app/layout.tsx (NextIntlClientProvider + getLocale)
                                    └── UI components (useTranslations / getTranslations)
    └── middleware.ts (createMiddleware composed with auth)

translation files (es.ts / en.ts)
    ├── i18n/types.d.ts (typeof enMessages shapes)
    ├── auth.form.ts factory refactor (t passed in)
    └── auth.constants.ts refactor (taglines removed)
```

Critical ordering rules:
- **Install before infrastructure.** `next-intl` must be in `package.json` before any `next-intl` imports compile.
- **Translation files before types.d.ts.** The type declarations use `typeof enMessages`, so the files must exist first.
- **Infrastructure before components.** `NextIntlClientProvider` must wrap the tree before `useTranslations` is called.
- **Form factory before widgets.** Widgets that call `buildLoginSchema(t)` depend on the factory signature.

---

## Phases

### Phase 1 — i18n Infrastructure (both apps)

**Goal:** Wire next-intl into both apps end-to-end with placeholder messages. After this phase, both apps compile, middleware composes correctly, and layout provides the intl context.

#### T1.1 — Install next-intl

Install `next-intl@^3` in `apps/client/package.json` and `apps/admin/package.json` (not workspace root — app-specific dependency).

```bash
npm install next-intl@^3 --workspace apps/client
npm install next-intl@^3 --workspace apps/admin
```

**Acceptance:** `next-intl` appears in both apps' `package.json` under `dependencies`.

---

#### T1.2 — Create `src/i18n/routing.ts` (both apps)

Create identical file in both apps:

```ts
// apps/{client,admin}/src/i18n/routing.ts
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export const routing = {
  locales,
  defaultLocale,
  localePrefix: 'never',   // no URL path prefixing
} as const;
```

**Acceptance:** File exists in both apps; no TypeScript errors.

---

#### T1.3 — Create `src/i18n/request.ts` (both apps)

Server-side config that detects locale and loads messages. The message loader is filled with real imports in Phase 2/4.

**apps/client:**
```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  const [auth, shared] = await Promise.all([
    import(`../features/auth/i18n/${locale}`),
    import(`../shared/i18n/${locale}`),
  ]);
  return {
    locale,
    messages: {
      auth: auth.default,
      shared: shared.default,
    },
  };
});
```

**apps/admin:**
```ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale;
  const [auth, admin, userManagement, shared] = await Promise.all([
    import(`../features/auth/i18n/${locale}`),
    import(`../features/admin/i18n/${locale}`),
    import(`../features/userManagement/i18n/${locale}`),
    import(`../shared/i18n/${locale}`),
  ]);
  return {
    locale,
    messages: {
      auth: auth.default,
      admin: admin.default,
      userManagement: userManagement.default,
      shared: shared.default,
    },
  };
});
```

Also create the next-intl plugin config in `next.config.ts` for each app:
```ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
export default withNextIntl(nextConfig);
```

**Acceptance:** Files exist; next.config.ts updated.

---

#### T1.4 — Compose next-intl middleware with existing middleware (both apps)

**apps/client** — existing middleware handles auth routing. Add intl middleware as the terminal handler:

```ts
// apps/client/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';
import { isAuthRoute, isPublicRoute } from '@/src/shared/utils/routes.utils';
import { isAuthenticated } from './src/lib/authMiddleware';

const handleI18n = createIntlMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (isAuthRoute(pathname) && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicRoute(pathname) && !authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

**apps/admin** — simpler middleware, same pattern:

```ts
// apps/admin/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/src/i18n/routing';

const handleI18n = createIntlMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return handleI18n(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

**Acceptance:** Middleware files updated; no TypeScript errors; existing auth redirect behavior preserved.

---

#### T1.5 — Update `app/layout.tsx` (both apps)

Wrap the tree with `NextIntlClientProvider` and set `lang` attribute dynamically via `getLocale()`.

```tsx
// apps/{client,admin}/src/app/layout.tsx
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
// ... other imports unchanged

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientProviders>
            {children}
            <PostHogPageView />
          </ClientProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Note: metadata will be updated in Phase 3 (T3.6) once shared translation files exist.

**Acceptance:** Layout wraps tree with provider; `lang` attribute is dynamic.

---

#### CHECKPOINT 1

```bash
npx turbo typecheck
npx turbo lint
```

Both must pass before proceeding. Translation files don't exist yet — the dynamic `import()` in `request.ts` will fail at runtime, but TypeScript compilation must succeed.

---

### Phase 2 — Translation Files: apps/client

**Goal:** Create all translation files for the client app. English and Spanish must have identical key shapes.

#### T2.1 — Create `src/features/auth/i18n/es.ts`

Full auth namespace per the spec Section 5 example. Includes all sections: `login`, `signUp`, `forgotPassword`, `resetPassword`, `verifyEmail`, `otp`, `callback`, `validation`, `password`.

#### T2.2 — Create `src/features/auth/i18n/en.ts`

Same key shape as `es.ts`, English translations for all keys.

```ts
// Must satisfy the same shape as es.ts — enforced via satisfies in T2.5
```

#### T2.3 — Create `src/shared/i18n/es.ts`

```ts
const shared = {
  errors: {
    generic: 'Algo salió mal',
    network: 'Error de conexión. Intenta de nuevo.',
  },
  metadata: {
    defaultTitle: 'HabitFlow',
    defaultDescription: 'Construye mejores hábitos cada día',
  },
} as const;
export default shared;
```

#### T2.4 — Create `src/shared/i18n/en.ts`

Same key shape as `es.ts`, English values.

#### T2.5 — Create `src/i18n/types.d.ts`

```ts
// apps/client/src/i18n/types.d.ts
import type authEn from '../features/auth/i18n/en';
import type sharedEn from '../shared/i18n/en';

type Messages = {
  auth: typeof authEn;
  shared: typeof sharedEn;
};

declare global {
  interface IntlMessages extends Messages {}
}
```

Add `satisfies` constraints on the `en.ts` files to enforce key parity:
```ts
// en.ts
import type { default as es } from './es';
const auth = { ... } as const satisfies typeof es;
export default auth;
```

**Acceptance:** All 4 files created; `types.d.ts` declares global `IntlMessages`; `npx turbo typecheck` passes for apps/client.

---

### Phase 3 — Client App String Extraction

**Goal:** All hardcoded Spanish strings removed from apps/client source files. Every user-facing string goes through `useTranslations` or `getTranslations`.

#### T3.1 — Refactor `src/features/auth/infrastructure/auth.form.ts`

Replace inline hardcoded Spanish validation messages with a factory function pattern. Each form schema builder receives a `t` function:

```ts
import type { useTranslations } from 'next-intl';

type TAuthTranslations = ReturnType<typeof useTranslations<'auth'>>;

export function buildLoginSchema(t: TAuthTranslations) {
  return z.object({
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string()
      .min(1, t('validation.passwordRequired'))
      .min(8, t('validation.passwordMin')),
  });
}
// Same pattern for: buildSignUpSchema, buildForgotPasswordSchema,
// buildResetPasswordSchema, buildOtpSchema, buildEmailCallbackSchema
```

Keep `TLoginForm`, `TSignUpForm`, etc. type aliases — infer them from the base schema (without superRefine, same as today).

Keep `createLoginDefaultValues()` etc. unchanged.

**Acceptance:** All Zod schemas use `t()` for messages; no Spanish strings remain; TypeScript types unchanged from callers' perspective.

---

#### T3.2 — Refactor `src/features/auth/domain/auth.constants.ts`

Remove `authTaglines` constant and update `getRandomTagline` to take a `readonly string[]` instead of a page key:

```ts
// Before: getRandomTagline(page: TAuthPageTypeEnum): string
// After:  getRandomTagline(taglines: readonly string[]): string
export function getRandomTagline(taglines: readonly string[]): string {
  const index = Math.floor(Math.random() * taglines.length);
  return taglines[index] ?? taglines[0] ?? '';
}
```

Remove `authTaglines` export entirely.

**Acceptance:** `authTaglines` removed; `getRandomTagline` signature updated; callers updated in T3.3.

---

#### T3.3 — Update auth widgets (7 files)

For each widget: add `useTranslations('auth')`, replace hardcoded strings, use form factory.

Files: `LoginForm.tsx`, `SignUpForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `OtpVerificationForm.tsx`, `VerifyEmailForm.tsx`, `AuthCallbackHandler.tsx`.

Pattern for LoginForm.tsx:
```tsx
const t = useTranslations('auth');
// Replace: getRandomTagline(authPageTypeEnumObject.login)
// With:    getRandomTagline(t.raw('login.taglines') as readonly string[])
// Replace: <AuthHeader title="Bienvenido de vuelta" ...>
// With:    <AuthHeader title={t('login.title')} ...>
// Replace: schema = loginFormDefinition
// With:    schema = buildLoginSchema(t)
```

**Acceptance:** No hardcoded Spanish in any widget; TypeScript compiles; Zod factory called with `t`.

---

#### T3.4 — Update auth UI components (up to 18 files)

For each component that renders user-visible text: add `useTranslations('auth')` (client) or receive translated props from parent (preferred for pure presentational components).

Key components with strings:
- `LoginFormContent.tsx` — field labels, placeholders, submit button, forgot password link
- `SignUpFormContent.tsx` — all field labels, terms text, submit button
- `ForgotPasswordFormContent.tsx`, `ResetPasswordFormContent.tsx` — labels, buttons
- `GoogleLoginButton.tsx` — button text
- `PasswordInput.tsx` — show/hide labels
- `CheckEmailStatus.tsx`, `StatusDisplay.tsx` — status messages
- `VerifyErrorStatus.tsx`, `VerifySuccessStatus.tsx`, `VerifyingStatus.tsx` — verify page states

For purely presentational components that receive all text as props, prefer passing translated strings from the parent widget rather than adding `useTranslations` to the component itself. This keeps components framework-agnostic.

**Acceptance:** No hardcoded Spanish strings remain in any auth component; TypeScript compiles.

---

#### T3.5 — Update auth pages (6 files)

Pages are thin wrappers. If any page has hardcoded strings (e.g., page-level metadata), update them.

Files: `LoginPage.tsx`, `SignUpPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `VerifyEmailPage.tsx`, `AuthCallbackPage.tsx`.

Server page components use `getTranslations('auth')`:
```tsx
export default async function LoginPage() {
  // No strings here currently — pages delegate to widgets
}
```

**Acceptance:** Pages compile; no hardcoded strings.

---

#### T3.6 — Update `app/layout.tsx` metadata

Replace hardcoded metadata with shared i18n keys:

```tsx
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shared');
  return {
    title: t('metadata.defaultTitle'),
    description: t('metadata.defaultDescription'),
  };
}
```

**Acceptance:** Metadata uses translation keys; TypeScript compiles.

---

#### CHECKPOINT 2

```bash
npx turbo typecheck --filter @repo/client
npx turbo lint --filter @repo/client
```

Both must pass. Manual smoke test: set `NEXT_LOCALE=en` cookie → English appears; remove → Spanish.

---

### Phase 4 — Translation Files: apps/admin

#### T4.1 — Create `src/features/auth/i18n/es.ts` + `en.ts`

Per spec Section 8:
```ts
{
  login: {
    heading, subtitle, emailLabel, emailPlaceholder, passwordLabel,
    passwordPlaceholder, submitButton, submitLoading, accessDenied,
    notAdmin, goToSite
  },
  validation: { /* same keys as client */ },
}
```

#### T4.2 — Create `src/features/admin/i18n/es.ts` + `en.ts`

Per spec Section 8:
```ts
{
  layout: {
    sidebarTitle, sidebarSubtitle, navDashboard, navUsers, navPlans,
    navRoles, logout,
  },
  dashboard: {
    heading, welcome,  // welcome uses {name} interpolation
  },
}
```

#### T4.3 — Create `src/features/userManagement/i18n/es.ts` + `en.ts`

```ts
{
  errors: { parsingParams },
}
```

#### T4.4 — Create `src/shared/i18n/es.ts` + `en.ts`

Same structure as client's shared namespace.

#### T4.5 — Create `src/i18n/types.d.ts`

```ts
import type authEn from '../features/auth/i18n/en';
import type adminEn from '../features/admin/i18n/en';
import type userManagementEn from '../features/userManagement/i18n/en';
import type sharedEn from '../shared/i18n/en';

type Messages = {
  auth: typeof authEn;
  admin: typeof adminEn;
  userManagement: typeof userManagementEn;
  shared: typeof sharedEn;
};

declare global {
  interface IntlMessages extends Messages {}
}
```

**Acceptance:** All translation files created; `types.d.ts` declares global types; key parity enforced via `satisfies`.

---

### Phase 5 — Admin App String Extraction

#### T5.1 — Refactor `src/features/auth/infrastructure/auth.form.ts`

Same factory pattern as client (T3.1) but limited to `buildLoginSchema(t)`:

```ts
export function buildLoginSchema(t: TAuthTranslations) {
  return z.object({
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });
}
```

#### T5.2 — Update `AdminLoginPage.tsx`

Replace all hardcoded strings with `useTranslations('auth')`:
- `"Panel de Administración"` → `t('login.heading')`
- `"Acceso exclusivo para administradores"` → `t('login.subtitle')`
- `"Correo electrónico"` → `t('login.emailLabel')`
- `"admin@ejemplo.com"` → `t('login.emailPlaceholder')`
- `"Contraseña"` → `t('login.passwordLabel')`
- `"••••••••"` → `t('login.passwordPlaceholder')`
- `"Iniciar sesión"` / `"Iniciando sesión..."` → `t('login.submitButton')` / `t('login.submitLoading')`
- `"Acceso denegado..."` → `t('login.accessDenied')`
- `"¿No eres administrador?"` → `t('login.notAdmin')`
- `"Ir al sitio principal"` → `t('login.goToSite')`
- Form schema: `zodResolver(buildLoginSchema(t))`

#### T5.3 — Update `AdminDashboardPage.tsx`

```tsx
const t = useTranslations('admin');
// "Dashboard" → t('dashboard.heading')
// "Bienvenido al panel de administración, {name}" → t('dashboard.welcome', { name: user?.firstName || user?.email })
```

#### T5.4 — Update `AdminLayout.tsx`

```tsx
const t = useTranslations('admin');
// "Admin Panel" → t('layout.sidebarTitle')
// "HabitFlow" → t('layout.sidebarSubtitle')
// "Dashboard" → t('layout.navDashboard')
// "Usuarios" → t('layout.navUsers')
// "Planes" → t('layout.navPlans')
// "Roles y Permisos" → t('layout.navRoles')
// "Cerrar sesión" → t('layout.logout')
```

---

#### CHECKPOINT 3 (Final)

```bash
npx turbo typecheck
npx turbo lint
```

Both apps must pass. Write Vitest integration test for form factory (T5.1 and T3.1):

```ts
// __tests__/auth.form.test.ts
import { buildLoginSchema } from '@/src/features/auth/infrastructure/auth.form';

it('returns zod schema with translated messages', () => {
  const t = (key: string) => `translated:${key}`;
  const schema = buildLoginSchema(t as any);
  const result = schema.safeParse({ email: '', password: '' });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.message).toBe('translated:validation.emailRequired');
});
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| next-intl dynamic `import()` with template literal may fail TypeScript strict module resolution | Use `/* @vite-ignore */` or type-cast if needed; test at typecheck step |
| Client components using `useTranslations` must be inside `NextIntlClientProvider` | Provider added to root layout in T1.5 before any component is modified |
| `auth.form.ts` factory changes the function signatures — callers must be updated atomically | T3.1 and T3.3 are in the same task group; typecheck enforces no stale callers |
| `getRandomTagline` signature change breaks callers | T3.2 and T3.3 done together; TypeScript catches all call sites |
| Admin app middleware matcher currently only matches `/` — must expand for intl to work on all routes | Updated matcher in T1.4: `/((?!api|_next/...).*)` |
| `en.ts` and `es.ts` key drift over time | `satisfies typeof esMessages` constraint on `en.ts` enforces parity at compile time |

---

## Files Changed Summary

### apps/client
| Action | File |
|---|---|
| Modify | `package.json` (+next-intl) |
| Modify | `next.config.ts` (withNextIntl plugin) |
| Modify | `middleware.ts` (compose with intl) |
| Create | `src/i18n/routing.ts` |
| Create | `src/i18n/request.ts` |
| Create | `src/i18n/types.d.ts` |
| Modify | `src/app/layout.tsx` (NextIntlClientProvider + getLocale) |
| Create | `src/features/auth/i18n/es.ts` |
| Create | `src/features/auth/i18n/en.ts` |
| Create | `src/shared/i18n/es.ts` |
| Create | `src/shared/i18n/en.ts` |
| Modify | `src/features/auth/domain/auth.constants.ts` (remove taglines) |
| Modify | `src/features/auth/infrastructure/auth.form.ts` (factory pattern) |
| Modify | `src/features/auth/ui/widgets/*.tsx` (7 files) |
| Modify | `src/features/auth/ui/components/*.tsx` (up to 18 files) |
| Modify | `src/features/auth/ui/pages/*.tsx` (if any have strings) |

### apps/admin
| Action | File |
|---|---|
| Modify | `package.json` (+next-intl) |
| Modify | `next.config.ts` (withNextIntl plugin) |
| Modify | `middleware.ts` (compose with intl) |
| Create | `src/i18n/routing.ts` |
| Create | `src/i18n/request.ts` |
| Create | `src/i18n/types.d.ts` |
| Modify | `src/app/layout.tsx` (NextIntlClientProvider + getLocale) |
| Create | `src/features/auth/i18n/es.ts` |
| Create | `src/features/auth/i18n/en.ts` |
| Create | `src/features/admin/i18n/es.ts` |
| Create | `src/features/admin/i18n/en.ts` |
| Create | `src/features/userManagement/i18n/es.ts` |
| Create | `src/features/userManagement/i18n/en.ts` |
| Create | `src/shared/i18n/es.ts` |
| Create | `src/shared/i18n/en.ts` |
| Modify | `src/features/auth/infrastructure/auth.form.ts` (factory) |
| Modify | `src/features/admin/ui/pages/AdminLoginPage.tsx` |
| Modify | `src/features/admin/ui/pages/AdminDashboardPage.tsx` |
| Modify | `src/features/admin/ui/layouts/AdminLayout.tsx` |
