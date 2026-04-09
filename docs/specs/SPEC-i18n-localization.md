# SPEC: Frontend Localization (i18n)

**Status:** Draft  
**Date:** 2026-04-08  
**Apps in scope:** `apps/client`, `apps/admin`  
**Languages:** English (`en`) · Spanish (`es`, default)

---

## 1. Objective

Introduce full localization to both Next.js 15 frontend apps using **next-intl** with **cookie/header-based** locale detection. Every user-facing string in `apps/client` and `apps/admin` will be extracted into per-feature `i18n/en.ts` and `i18n/es.ts` files. Translation keys will be fully type-safe. No URL-path routing changes (`/en/...` is not required).

**Target users:** End-users of the client app and administrators of the admin app — both currently see Spanish-only UI. After this, the UI defaults to Spanish but respects a locale cookie or `Accept-Language` header to serve English.

---

## 2. Library & Version

| Package | Role |
|---|---|
| `next-intl@^3` | i18n runtime, RSC-compatible, type-safe |

next-intl is chosen because:
- First-class support for Next.js App Router and React Server Components
- Cookie-based locale strategy (no URL rewrites needed)
- Built-in TypeScript plugin for key autocomplete and type errors on missing keys
- Supports namespace splitting (one namespace per feature)

**No other i18n library should be introduced.**

---

## 3. Locale Strategy

### Detection order (evaluated on every request in middleware)

1. `NEXT_LOCALE` cookie (set when user explicitly switches locale — future feature)
2. `Accept-Language` request header
3. Fallback: `es` (Spanish default)

### Implementation

- `middleware.ts` (root of each app) uses `next-intl/middleware` to detect locale and attach it to the request. No URL rewriting.
- Locale is passed to layouts via `getLocale()` (server) and `useLocale()` (client).
- The `NEXT_LOCALE` cookie is `SameSite=Lax; Path=/; HttpOnly=false` (must be readable by JS for a future locale switcher).

### Supported locales

```ts
export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';
```

---

## 4. Project Structure

### Per-app layout

```
apps/client/src/
├── features/
│   └── auth/
│       ├── i18n/
│       │   ├── en.ts        # English strings for auth feature
│       │   └── es.ts        # Spanish strings for auth feature
│       ├── ui/
│       ├── application/
│       ├── domain/
│       └── infrastructure/
└── shared/
    └── i18n/
        ├── en.ts            # Common strings (errors, buttons, metadata)
        └── es.ts

apps/admin/src/
├── features/
│   ├── auth/
│   │   └── i18n/
│   │       ├── en.ts
│   │       └── es.ts
│   ├── admin/
│   │   └── i18n/
│   │       ├── en.ts
│   │       └── es.ts
│   └── userManagement/
│       └── i18n/
│           ├── en.ts
│           └── es.ts
└── shared/
    └── i18n/
        ├── en.ts
        └── es.ts
```

### Root i18n aggregator (per app)

Each app has a root aggregator that merges all feature namespaces into a single messages object consumed by next-intl:

```
apps/client/src/i18n/
├── request.ts       # next-intl server config (locale detection, message loading)
└── routing.ts       # locale constants

apps/admin/src/i18n/
├── request.ts
└── routing.ts
```

### Messages shape (namespaced by feature)

```ts
// apps/client/src/i18n/request.ts — loads messages dynamically
import type { Locale } from './routing';

export async function getMessages(locale: Locale) {
  const [auth, shared] = await Promise.all([
    import(`../features/auth/i18n/${locale}`),
    import(`../shared/i18n/${locale}`),
  ]);
  return {
    auth: auth.default,
    shared: shared.default,
  };
}
```

### TypeScript type declarations

```ts
// apps/client/src/i18n/types.d.ts
import type enMessages from '../shared/i18n/en';
import type authEn from '../features/auth/i18n/en';

type Messages = {
  shared: typeof enMessages;
  auth: typeof authEn;
};

declare global {
  interface IntlMessages extends Messages {}
}
```

This gives full autocomplete and compile-time errors for missing/wrong keys.

---

## 5. Translation Key Conventions

- Keys use **camelCase**
- Keys are **descriptive, not generic** (`emailLabel` not `label1`)
- Keys are **grouped by UI section** within each feature file
- Interpolations use named params: `"sentTo": "Enviamos un enlace a {email}"`
- Plurals follow next-intl ICU format: `"count": "{count, plural, one {# elemento} other {# elementos}}"`

### Example: `apps/client/src/features/auth/i18n/es.ts`

```ts
const auth = {
  login: {
    title: 'Bienvenido de vuelta',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Ingresa tu contraseña',
    forgotPassword: '¿Olvidaste?',
    submitButton: 'Continuar',
    submitLoading: 'Iniciando sesión...',
    noAccount: '¿Eres nuevo?',
    createAccount: 'Crea una cuenta',
    googleButton: 'Continuar con Google',
    taglines: [
      '¿Listo para alcanzar tus metas hoy?',
      '¡Tu racha te espera!',
      'Cada día es un nuevo comienzo.',
      '¡Bienvenido de vuelta, campeón!',
    ],
  },
  signUp: {
    title: 'Crea una cuenta',
    firstNameLabel: 'Nombre (opcional)',
    firstNamePlaceholder: 'Tu nombre',
    lastNameLabel: 'Apellido (opcional)',
    lastNamePlaceholder: 'Tu apellido',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Crea una contraseña',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Confirma tu contraseña',
    submitButton: 'Comenzar',
    submitLoading: 'Creando cuenta...',
    termsText: 'Al continuar, aceptas nuestros {terms} y {privacy}',
    termsLink: 'Términos',
    privacyLink: 'Política de Privacidad',
    hasAccount: '¿Ya tienes una cuenta?',
    signIn: 'Inicia sesión',
    taglines: [
      '¡Comienza tu camino hacia mejores hábitos!',
      'Únete a miles construyendo mejores vidas.',
      'Tu yo del futuro te lo agradecerá.',
      'Pequeños pasos, grandes cambios.',
    ],
  },
  forgotPassword: {
    title: 'Restablecer contraseña',
    description: '¡No te preocupes! Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    submitButton: 'Enviar enlace',
    submitLoading: 'Enviando...',
    backToLogin: 'Volver a iniciar sesión',
    emailSentTitle: 'Revisa tu bandeja de entrada',
    emailSentMessage: 'Enviamos un código de verificación a {email}',
    enterCodeButton: 'Ingresar código',
    tryAnotherEmail: 'Intentar con otro correo',
    taglines: [
      '¡No te preocupes, te ayudamos!',
      'Le pasa a los mejores.',
      'Vamos a ponerte de vuelta en marcha.',
    ],
  },
  resetPassword: {
    title: 'Nueva contraseña',
    description: 'Ingresa el código de 6 dígitos que enviamos a {email} y tu nueva contraseña.',
    otpLabel: 'Código de verificación',
    newPasswordLabel: 'Nueva contraseña',
    newPasswordPlaceholder: 'Mínimo 8 caracteres',
    confirmPasswordLabel: 'Confirmar contraseña',
    confirmPasswordPlaceholder: 'Repite tu nueva contraseña',
    submitButton: 'Restablecer contraseña',
    submitLoading: 'Restableciendo...',
    backToLogin: 'Volver a iniciar sesión',
    noEmailError: 'No se proporcionó un correo electrónico. Por favor, inicia el proceso de recuperación nuevamente.',
  },
  verifyEmail: {
    title: 'Verifica tu correo',
    titleSuccess: 'Correo verificado',
    subtitleSuccess: 'Bienvenido a HabitFlow',
    defaultMessage: 'Te enviamos un enlace de verificación. Haz clic en él para confirmar tu correo y comenzar.',
    defaultNote: '¿No lo recibiste? Revisa spam o contacta soporte.',
    defaultActionLabel: 'Volver a iniciar sesión',
    expiredError: 'Este enlace o código puede haber expirado. No te preocupes, intenta de nuevo.',
    verifyingMessage: 'Verificando tu correo...',
    successMessage: 'Tu correo ha sido verificado. ¡Estás listo para empezar a construir grandes hábitos!',
    successButton: '¡Vamos!',
    errorTitle: 'Algo salió mal',
    errorRetryLabel: 'Intentar de nuevo',
    errorBackLabel: 'Volver a iniciar sesión',
    taglines: [
      '¡Ya casi!',
      'Un paso más hacia la grandeza.',
      '¡Verifica y empieza a lograr!',
    ],
  },
  otp: {
    title: 'Ingresa el código de verificación',
    message: 'Te enviamos un código de 6 dígitos a {email}',
    label: 'Código OTP',
    submitButton: 'Verificar',
    resendButton: '¿No lo recibiste? Reenviar código',
    resendingButton: 'Reenviando...',
  },
  callback: {
    loadingTitle: 'Autenticando...',
    loadingSubtitle: 'Por favor espera',
    successTitle: 'Autenticación exitosa',
    successSubtitle: 'Bienvenido a HabitFlow',
    errorTitle: 'Error de autenticación',
    errorSubtitle: 'Algo salió mal',
    loadingStatus: 'Completando autenticación con Google...',
    successStatus: 'Tu cuenta ha sido verificada. Redirigiendo al dashboard...',
    errorStatus: 'No se pudo completar la autenticación con Google.',
    retryButton: 'Intentar de nuevo',
  },
  validation: {
    emailRequired: 'El correo es obligatorio',
    emailInvalid: 'Por favor ingresa un correo válido',
    passwordMin: 'La contraseña debe tener al menos 8 caracteres',
    passwordRequired: 'La contraseña es obligatoria',
    nameMax: 'El nombre debe tener menos de 50 caracteres',
    confirmPasswordRequired: 'Por favor confirma tu contraseña',
    passwordsMismatch: 'Las contraseñas no coinciden',
    otpDigits: 'El código debe tener 6 dígitos',
    tokenRequired: 'Token requerido',
    typeRequired: 'Tipo requerido',
  },
  password: {
    weak: 'Débil',
    fair: 'Regular',
    good: 'Buena',
    strong: 'Fuerte',
    show: 'Mostrar contraseña',
    hide: 'Ocultar contraseña',
  },
} as const;

export default auth;
```

### Example: `apps/client/src/shared/i18n/es.ts`

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

---

## 6. Files to Create / Modify

### `apps/client`

| Action | File |
|---|---|
| Create | `src/i18n/routing.ts` |
| Create | `src/i18n/request.ts` |
| Create | `src/i18n/types.d.ts` |
| Create | `middleware.ts` |
| Create | `src/features/auth/i18n/en.ts` |
| Create | `src/features/auth/i18n/es.ts` |
| Create | `src/shared/i18n/en.ts` |
| Create | `src/shared/i18n/es.ts` |
| Modify | `src/app/layout.tsx` — wrap with `NextIntlClientProvider`, add `getLocale()` |
| Modify | All auth UI components/widgets — replace hardcoded strings with `useTranslations('auth')` |
| Modify | `src/features/auth/infrastructure/auth.form.ts` — Zod messages use `t('auth.validation.xxx')` via a factory function receiving `t` |
| Modify | `src/features/auth/domain/auth.constants.ts` — taglines moved to i18n files |
| Modify | `src/app/layout.tsx` metadata — use `shared.metadata` keys |

### `apps/admin`

| Action | File |
|---|---|
| Create | `src/i18n/routing.ts` |
| Create | `src/i18n/request.ts` |
| Create | `src/i18n/types.d.ts` |
| Create | `middleware.ts` |
| Create | `src/features/auth/i18n/en.ts` |
| Create | `src/features/auth/i18n/es.ts` |
| Create | `src/features/admin/i18n/en.ts` |
| Create | `src/features/admin/i18n/es.ts` |
| Create | `src/features/userManagement/i18n/en.ts` |
| Create | `src/features/userManagement/i18n/es.ts` |
| Create | `src/shared/i18n/en.ts` |
| Create | `src/shared/i18n/es.ts` |
| Modify | `src/app/layout.tsx` — `NextIntlClientProvider` |
| Modify | All admin feature UI components — replace hardcoded strings |

### Package dependency (both apps)

```json
"next-intl": "^3"
```

Added to each app's `package.json` individually (not workspace root — it's app-specific).

---

## 7. Component Usage Pattern

### Server Component

```tsx
import { getTranslations } from 'next-intl/server';

export default async function LoginPage() {
  const t = await getTranslations('auth');
  return <LoginForm title={t('login.title')} />;
}
```

### Client Component

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function LoginFormContent() {
  const t = useTranslations('auth');
  return (
    <input
      placeholder={t('login.emailPlaceholder')}
      aria-label={t('login.emailLabel')}
    />
  );
}
```

### Zod validation messages (form factory pattern)

```ts
// infrastructure/auth.form.ts
import type { TranslationValues } from 'next-intl';

export function buildLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z
      .string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.emailInvalid')),
    password: z
      .string()
      .min(1, t('validation.passwordRequired'))
      .min(8, t('validation.passwordMin')),
  });
}
```

Called from the widget: `const schema = buildLoginSchema(t);`

---

## 8. Admin Strings to Extract

### `features/auth/i18n/es.ts`

```ts
{
  login: {
    heading: 'Panel de Administración',
    subtitle: 'Acceso exclusivo para administradores',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'admin@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: '••••••••',
    submitButton: 'Iniciar sesión',
    submitLoading: 'Iniciando sesión...',
    accessDenied: 'Acceso denegado. Solo los administradores pueden acceder.',
    notAdmin: '¿No eres administrador?',
    goToSite: 'Ir al sitio principal',
  },
  validation: { /* same pattern as client */ },
}
```

### `features/admin/i18n/es.ts`

```ts
{
  layout: {
    sidebarTitle: 'Admin Panel',
    sidebarSubtitle: 'HabitFlow',
    navDashboard: 'Dashboard',
    navUsers: 'Usuarios',
    navPlans: 'Planes',
    navRoles: 'Roles y Permisos',
    logout: 'Cerrar sesión',
  },
  dashboard: {
    heading: 'Dashboard',
    welcome: 'Bienvenido al panel de administración, {name}',
  },
}
```

### `features/userManagement/i18n/es.ts`

```ts
{
  // Currently minimal — scaffold for future strings
  errors: {
    parsingParams: 'Error al procesar parámetros',
  },
}
```

---

## 9. Acceptance Criteria

- [ ] `next-intl` installed in both `apps/client` and `apps/admin`
- [ ] Locale detection: Spanish by default, English if `NEXT_LOCALE=en` cookie or `Accept-Language: en` header
- [ ] Every hardcoded user-facing string extracted into feature-level `i18n/en.ts` + `i18n/es.ts`
- [ ] Shared common strings in `shared/i18n/en.ts` + `shared/i18n/es.ts`
- [ ] TypeScript types declared — wrong/missing keys produce compile errors
- [ ] Zod validation messages translated via form factory function (no hardcoded Spanish in Zod schemas)
- [ ] Taglines arrays moved from `auth.constants.ts` to i18n files
- [ ] `npx turbo typecheck` passes for both apps
- [ ] `npx turbo lint` passes for both apps
- [ ] No string is added twice (shared vs feature — shared wins for strings used in 2+ features)
- [ ] `en.ts` and `es.ts` have identical key shapes (TypeScript enforces this via `satisfies` or shared type)

---

## 10. Testing Strategy

- **Type checking is the primary guard** — key shape parity between `en.ts` and `es.ts` is enforced via `typeof enMessages` constraint
- **No unit tests for translation files** — keys are verified at compile time
- **Smoke test (manual):** Set `NEXT_LOCALE=en` cookie in browser → verify English text appears; remove cookie → Spanish appears
- **Integration test (Vitest):** Test form factory `buildLoginSchema(t)` with a mock `t` function returns correct Zod schema with translated messages

---

## 11. Out of Scope

- URL-based locale routing (`/en/...`, `/es/...`)
- Locale switcher UI component (infrastructure only)
- RTL language support
- Pluralization beyond basic counts
- Date/number formatting (next-intl provides this but it is not required here)
- Translation management tooling (Crowdin, Lokalise)
- Machine translation — all strings must be human-authored

---

## 12. Boundaries

### Always do
- One `i18n/` directory per feature, never one global flat file
- `en.ts` and `es.ts` must be kept in sync (same key structure)
- Use `useTranslations` / `getTranslations` — never import locale files directly in components
- Add new string to both locale files simultaneously

### Ask first about
- Adding a third language
- Moving strings between `shared/i18n` and a feature's `i18n`
- Changing the default locale from `es` to `en`

### Never do
- Hardcode user-facing strings in JSX after this feature lands
- Use `any` for translation function types
- Import `en.ts` or `es.ts` directly in component files
- Mix locale files and component logic in the same file
