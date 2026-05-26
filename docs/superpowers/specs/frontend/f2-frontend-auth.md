# F2-Frontend: Auth Core — Pages & Guards

**Date:** 2026-05-26
**Status:** Draft
**Mirrors:** `docs/superpowers/specs/2026-05-25-f2-auth-core-security.md` (backend F2)
**Depends on:** F1-frontend
**Blocks:** F3-frontend (RBAC guards), F4-frontend (password management pages)

---

## Objetivo

Implementar todas las páginas de autenticación con **layout A (Centered Card)** en ambas apps (`apps/client` + `apps/admin`), protección de rutas con middleware de Next.js, y sección de seguridad (cambio de contraseña + sesiones activas). Al terminar: el flujo completo signup → verify-email → login → logout funciona de extremo a extremo.

---

## Fuera de scope

- OAuth / Google (F6-frontend)
- 2FA (F6-frontend)
- RBAC en UI más allá del guard de admin (F3-frontend)
- Onboarding / profile completion (F7-frontend)

---

## Layout — Centered Card (A)

Todas las páginas de auth usan el mismo shell:

```
┌────────────────────────────────────────────┐
│                 (neutral bg)               │
│                                            │
│         ┌──────────────────────┐           │
│         │  [Logo / App name]   │           │
│         │                      │           │
│         │  [Título de página]  │           │
│         │  [Subtítulo/hint]    │           │
│         │                      │           │
│         │  [Form fields]       │           │
│         │                      │           │
│         │  [Primary CTA btn]   │           │
│         │                      │           │
│         │  [Link secundario]   │           │
│         └──────────────────────┘           │
│                                            │
└────────────────────────────────────────────┘
```

- Card: `max-w-md w-full`, `rounded-2xl`, `shadow-xl`, `p-8`
- Background: `bg-muted/40` (Tailwind; adaptar al design token del proyecto)
- Logo: shared entre `apps/client` y `apps/admin` (diferente branding por app)
- Responsive: full-width con padding en móvil

---

## Páginas

### Apps/client — rutas de auth

| Ruta | Archivo | Descripción |
|---|---|---|
| `/auth/login` | `app/(auth)/login/page.tsx` | Email + pass + "Forgot password" link |
| `/auth/register` | `app/(auth)/register/page.tsx` | Nombre, email, password, confirm password |
| `/auth/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Email → trigger reset email |
| `/auth/reset-password` | `app/(auth)/reset-password/page.tsx` | Nuevo password (lee `?token=` de URL) |
| `/auth/verify-email` | `app/(auth)/verify-email/page.tsx` | Auto-calls verify, muestra resultado |
| `/auth/email-verified` | `app/(auth)/email-verified/page.tsx` | Callback landing (success / error) |
| `/auth/check-email` | `app/(auth)/check-email/page.tsx` | Post-signup: "Check your inbox" |

### Apps/admin — rutas de auth

| Ruta | Archivo | Descripción |
|---|---|---|
| `/auth/login` | `app/(auth)/login/page.tsx` | Email + pass. Sin registro (invite-only) |
| `/auth/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Igual que client |
| `/auth/reset-password` | `app/(auth)/reset-password/page.tsx` | Igual que client |

### Settings — ambas apps

| Ruta | Archivo | Descripción |
|---|---|---|
| `/settings/security` | `app/(app)/settings/security/page.tsx` | Change password + sessions list |
| `/settings/profile` | `app/(app)/settings/profile/page.tsx` | Display name, avatar |

---

## Archivos a crear / modificar

```
apps/client/src/
├── middleware.ts                               ← protección de rutas
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                          ← AuthLayout (centered card shell, sin navbar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   ├── email-verified/page.tsx
│   │   └── check-email/page.tsx
│   └── (app)/
│       └── settings/
│           ├── security/page.tsx
│           └── profile/page.tsx
└── components/
    └── auth/
        ├── login-form.tsx
        ├── register-form.tsx
        ├── forgot-password-form.tsx
        ├── reset-password-form.tsx
        ├── change-password-form.tsx
        ├── sessions-list.tsx
        └── auth-card.tsx                       ← card shell reutilizable

apps/admin/src/
├── middleware.ts                               ← igual que client + check ADMIN role
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   └── (app)/
│       └── settings/
│           ├── security/page.tsx
│           └── profile/page.tsx
└── components/
    └── auth/
        ├── login-form.tsx
        ├── change-password-form.tsx
        └── sessions-list.tsx
```

---

## Detalles de implementación

### `AuthLayout` (`app/(auth)/layout.tsx`)

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      {children}
    </div>
  );
}
```

Cada página renderiza su propio `AuthCard`:

```tsx
// components/auth/auth-card.tsx
import { AppLogo } from '@/components/app-logo';

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-xl border border-border">
      <div className="flex flex-col items-center gap-2">
        <AppLogo className="h-10 w-auto" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground text-center">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
```

---

### `middleware.ts` — apps/client

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/email-verified',
  '/auth/check-email',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const sessionCookie = request.cookies.get('app.session_token'); // matches COOKIE_PREFIX

  // Redirect unauthenticated users to login
  if (!isPublic && !sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isPublic && sessionCookie && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### `middleware.ts` — apps/admin

Igual que client, pero además verifica que el usuario tenga rol `ADMIN`. Como el middleware no puede hacer fetch al API sin penalizar el TTFB, la verificación de rol se hace en el layout del grupo `(app)` mediante un Server Component que llama a `GET /api/v1/auth/session`.

```tsx
// apps/admin/src/app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server-session'; // fetch server-side session

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/auth/login');
  if (session.user.role?.code !== 'ADMIN') redirect('/auth/login?error=forbidden');
  return <>{children}</>;
}
```

---

### `login-form.tsx`

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSignIn } from '@repo/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { FormField, FormItem, FormLabel, FormMessage } from '@repo/ui/form';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const redirectTo  = params.get('redirectTo') ?? '/';
  const { mutate, isPending } = useSignIn();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    mutate(values, {
      onSuccess: (result) => {
        if (result.ok) {
          router.push(redirectTo);
        } else {
          form.setError('root', { message: result.message });
        }
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {form.formState.errors.root && (
        <p className="text-sm text-destructive text-center">
          {form.formState.errors.root.message}
        </p>
      )}
      <FormField control={form.control} name="email" render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <Input type="email" autoComplete="email" {...field} />
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="password" render={({ field }) => (
        <FormItem>
          <FormLabel>Password</FormLabel>
          <Input type="password" autoComplete="current-password" {...field} />
          <FormMessage />
        </FormItem>
      )} />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
```

---

### `register-form.tsx` (client only)

Schema:
```typescript
const schema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(8).max(128),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
```

On success (`result.ok === true`): redirect to `/auth/check-email`.

---

### `forgot-password-form.tsx`

Schema: `z.object({ email: z.string().email() })`

On success: muestra mensaje "If this email exists you'll receive a reset link" (no confirmar si existe o no — anti-enumeration).

---

### `reset-password-form.tsx`

Lee `token` de `useSearchParams`. Si `token` está ausente: muestra error "Invalid reset link".

Schema:
```typescript
const schema = z.object({
  password: z.string().min(8).max(128),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
```

On success: redirect to `/auth/login?reset=success`.

---

### `verify-email/page.tsx`

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmailMutation } from '@repo/auth';

export default function VerifyEmailPage() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get('token');
  const called  = useRef(false);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;
    void verifyEmailMutation(token).then((result) => {
      router.replace(result.ok ? '/auth/email-verified?status=success' : `/auth/email-verified?status=error&code=${result.error}`);
    });
  }, [token, router]);

  return <div className="text-sm text-muted-foreground">Verifying your email…</div>;
}
```

---

### `change-password-form.tsx` (settings/security)

Schema:
```typescript
const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(128),
  confirm:         z.string(),
}).refine(d => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
```

Calls `POST /api/v1/auth/change-password` (F4-backend endpoint via Better Auth).

---

### `sessions-list.tsx` (settings/security)

- Fetches `GET /api/v1/auth/list-sessions` via Better Auth client
- Shows: device, IP (if available), last active, current session badge
- Each row has "Revoke" button → `DELETE /api/v1/auth/revoke-session` with session ID
- Revoke invalidates the session in Redis (backend handles) and refreshes the list

---

## Validación de formularios — reglas generales

| Campo | Validación |
|---|---|
| Email | `z.string().email()` |
| Password | `z.string().min(8).max(128)` — validación básica en cliente; política compleja solo en backend |
| Confirm password | `.refine(d => d.password === d.confirm)` |
| Nombre | `z.string().min(1).max(100)` |

**Regla:** El cliente valida formato; el backend valida política (complejidad, historial). Los mensajes del backend (`result.message`) se muestran directamente — son ya i18n por el `Accept-Language` header.

---

## Manejo de errores i18n

El backend devuelve mensajes ya traducidos vía `Accept-Language` header. El cliente debe:

1. Enviar `Accept-Language` en cada request de better-auth/client
2. Mostrar `result.message` directamente en el form (`form.setError('root', { message: result.message })`)
3. No hacer lookup local de códigos de error — confiar en el backend

```typescript
// En el better-auth client init — pasar el locale del browser
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  fetchOptions: {
    headers: {
      'Accept-Language': typeof navigator !== 'undefined'
        ? navigator.language
        : 'es',
    },
  },
});
```

---

## Acceptance Criteria

- [ ] `GET /auth/login` sin sesión → muestra formulario
- [ ] Login correcto → redirect a `/` (client) o `/dashboard` (admin)
- [ ] Login incorrecto → mensaje de error en español por defecto (`INVALID_EMAIL_OR_PASSWORD`)
- [ ] Login con email no verificado → mensaje "Por favor verifica tu correo"
- [ ] Lockout tras 5 intentos → mensaje `AUTH_ACCOUNT_LOCKED`
- [ ] Register → redirect a `/auth/check-email`
- [ ] Click en link de verificación → `/auth/email-verified?status=success`
- [ ] `/auth/forgot-password` → siempre muestra "If this email exists…" (anti-enumeration)
- [ ] `/auth/reset-password?token=...` → actualiza contraseña, redirect a login
- [ ] `/auth/reset-password` sin token → muestra error "Invalid reset link"
- [ ] `/settings/security` autenticado → muestra form de cambio de contraseña
- [ ] `/settings/security` autenticado → muestra lista de sesiones activas con botón Revoke
- [ ] Revocar sesión → sesión desaparece de la lista
- [ ] Ruta protegida sin sesión → redirect a `/auth/login?redirectTo=<ruta>`
- [ ] Login en admin sin rol ADMIN → redirect a `/auth/login?error=forbidden`
- [ ] `npx turbo typecheck` pasa en ambas apps

---

## Notas de implementación

- **Cookie name:** `app.session_token` (matches `COOKIE_PREFIX=app` del backend). Si el env cambia, actualizar el middleware.
- **`redirectTo` en middleware:** Usar `encodeURIComponent` para URLs con query params anidados.
- **`check-email` page:** Página estática con mensaje "Check your inbox. Click the link in the email to verify your account." + botón "Resend email" que llama a `sendVerificationMutation(email)`.
- **`email-verified` page:** Lee `?status=success|error` y `?code=` para mostrar el resultado apropiado. Si `status=success`, muestra botón "Continue to app" que lleva a `/auth/login` o `/` si ya hay sesión (autoSignInAfterVerification=true en backend).
- **Admin sin registro:** `apps/admin` no tiene página `/register`. Los admins son creados por invite (F7-frontend o backoffice).
- **Google button:** Placeholder `<Button variant="outline">Continue with Google</Button>` deshabilitado hasta F6-frontend. Solo visible si `NEXT_PUBLIC_GOOGLE_ENABLED=true`.
- **Captcha:** Si `NEXT_PUBLIC_CAPTCHA_ENABLED=true`, agregar `<CloudflareTurnstile siteKey={env.NEXT_PUBLIC_CAPTCHA_SITE_KEY} />` al form de login y register. Better Auth valida el token en el backend.
- **`useEffect` en verify-email:** `useRef(called)` previene doble invocación en StrictMode (React 18 double-effect in dev).
