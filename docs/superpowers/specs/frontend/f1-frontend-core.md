# F1-Frontend: Core Infrastructure

**Date:** 2026-05-26
**Status:** Draft
**Mirrors:** `docs/superpowers/specs/2026-05-25-f1-core-infrastructure.md` (backend F1)
**Depends on:** Backend F1 + F2 running
**Blocks:** F2-frontend

---

## Objetivo

Construir la infraestructura base del frontend: cliente de API tipado, patrón `Safe<T>` para manejo de errores sin excepciones, integración de better-auth/client con capa de abstracción, configuración de React Query, y env con validación Zod en ambas apps. Al terminar este feature ambas apps (`client` + `admin`) tienen los cimientos para implementar cualquier flujo de auth y datos.

---

## Fuera de scope

- Páginas de auth (F2-frontend)
- Guards de ruta específicos de auth (F2-frontend)
- Permisos y RBAC en UI (futuro)

---

## Archivos a crear / modificar

```
packages/auth/
├── src/
│   ├── client/
│   │   ├── better-auth.client.ts       ← createAuthClient() con baseURL de env
│   │   └── index.ts                    ← re-export del cliente
│   ├── mutations/
│   │   ├── sign-in.mutation.ts         ← signIn(email, password) → Safe<Session>
│   │   ├── sign-up.mutation.ts         ← signUp(data) → Safe<{ requiresEmailVerification: true }>
│   │   ├── sign-out.mutation.ts        ← signOut() → Safe<void>
│   │   ├── forget-password.mutation.ts ← forgetPassword(email) → Safe<void>
│   │   ├── reset-password.mutation.ts  ← resetPassword(token, password) → Safe<void>
│   │   ├── verify-email.mutation.ts    ← verifyEmail(token) → Safe<void>
│   │   └── send-verification.mutation.ts ← sendVerification(email) → Safe<void>
│   ├── queries/
│   │   ├── session.query.ts            ← sessionQueryOptions() — React Query queryOptions
│   │   └── index.ts
│   ├── hooks/
│   │   ├── use-session.ts              ← useSession() → { session, isPending, isAuthenticated }
│   │   ├── use-sign-in.ts              ← useSignIn() → { mutate, isPending, error }
│   │   ├── use-sign-up.ts
│   │   ├── use-sign-out.ts
│   │   ├── use-forget-password.ts
│   │   ├── use-reset-password.ts
│   │   └── index.ts                    ← re-exports
│   ├── domain/
│   │   └── auth.model.ts               ← actualizar: Session sin tokens JWT (mejor-auth cookie-based)
│   ├── index.ts                        ← public API del paquete
│   └── components/
│       └── roleGuards.tsx              ← mantener, actualizar tipos si es necesario
│
packages/utils/src/
│   └── safe.ts                         ← Safe<T> tipo + helpers (ok, err, trySafe)
│
apps/client/
│   ├── src/env.ts                      ← @t3-oss/env-nextjs schema
│   └── src/lib/
│       └── query-client.ts             ← QueryClient singleton con defaults
│
apps/admin/
│   ├── src/env.ts
│   └── src/lib/
│       └── query-client.ts
```

---

## Detalles de implementación

### `packages/utils/src/safe.ts` — Safe\<T\>

Discriminated union que fuerza al caller a manejar errores explícitamente. Sin try/catch en los componentes.

```typescript
export type Safe<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

export function ok<T>(data: T): Safe<T> {
  return { ok: true, data };
}

export function err<T = never>(error: string, message: string): Safe<T> {
  return { ok: false, error, message };
}

/**
 * Wraps a Promise and catches any thrown error into Safe<T>.
 * Use at the edge (API layer) — not inside domain logic.
 */
export async function trySafe<T>(
  fn: () => Promise<T>
): Promise<Safe<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const code = (e as { code?: string })?.code ?? 'UNKNOWN_ERROR';
    const msg  = (e as { message?: string })?.message ?? 'An unexpected error occurred';
    return err(code, msg);
  }
}
```

**Regla:** Ningún hook ni componente hace `throw`. Retornan `Safe<T>` o lo reciben.

---

### `packages/auth/src/client/better-auth.client.ts`

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
});

// Re-export typed hooks from better-auth/react so the rest
// of the package can depend on this one import.
export const {
  useSession: useBetterAuthSession,
  signIn: rawSignIn,
  signOut: rawSignOut,
  signUp: rawSignUp,
  forgetPassword: rawForgetPassword,
  resetPassword: rawResetPassword,
  verifyEmail: rawVerifyEmail,
  sendVerificationEmail: rawSendVerification,
} = authClient;
```

**Nota:** `better-auth/react` usa cookies HTTPOnly — no hay tokens en localStorage. El cliente solo necesita la `baseURL` para las llamadas REST.

---

### `packages/auth/src/mutations/sign-in.mutation.ts`

```typescript
import type { Safe } from '@repo/utils/safe';
import { err, ok } from '@repo/utils/safe';
import { rawSignIn } from '../client/better-auth.client';

export interface SignInInput {
  email: string;
  password: string;
  callbackURL?: string;
}

export async function signInMutation(input: SignInInput): Promise<Safe<void>> {
  const result = await rawSignIn.email({
    email: input.email,
    password: input.password,
    callbackURL: input.callbackURL,
  });

  if (result.error) {
    return err(result.error.code ?? 'SIGN_IN_ERROR', result.error.message ?? 'Sign in failed');
  }

  return ok(undefined);
}
```

Misma estructura para `signUp`, `signOut`, `forgetPassword`, `resetPassword`, `verifyEmail`, `sendVerification`.

---

### `packages/auth/src/queries/session.query.ts`

```typescript
import { queryOptions } from '@tanstack/react-query';
import { authClient } from '../client/better-auth.client';

export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data ?? null; // null = no active session
    },
    staleTime: 1000 * 60 * 5,   // 5 min — matches cookie cache maxAge
    gcTime:    1000 * 60 * 10,
    retry: false,                // don't retry 401s
  });
```

---

### `packages/auth/src/hooks/use-session.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { sessionQueryOptions } from '../queries/session.query';

export function useSession() {
  const query = useQuery(sessionQueryOptions());

  return {
    session:         query.data ?? null,
    isAuthenticated: query.data !== null && query.data !== undefined,
    isPending:       query.isPending,
    isError:         query.isError,
  };
}
```

---

### `packages/auth/src/hooks/use-sign-in.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signInMutation } from '../mutations/sign-in.mutation';
import type { Safe } from '@repo/utils/safe';

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signInMutation,
    onSuccess: (result: Safe<void>) => {
      if (result.ok) {
        // Invalidate session cache → triggers re-fetch
        void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
      }
    },
  });
}
```

---

### Actualización `packages/auth/src/domain/auth.model.ts`

`Session` ya no tiene `accessToken`/`refreshToken` — Better Auth usa cookies HTTPOnly. Actualizar:

```typescript
export interface Session {
  user: User;
  expiresAt: Date;
  sessionId: string;
}
```

El campo `AuthState` refleja el mismo cambio. Los hooks existentes (`useAuthGuard`, `useAdminGuard`, etc.) siguen funcionando porque dependen de `session.user`, no de tokens.

---

### `apps/client/src/env.ts` (y `apps/admin/src/env.ts`)

```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_APP_NAME: z.string().default('MyApp'),
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: z.string().optional(),
    NEXT_PUBLIC_CAPTCHA_ENABLED: z.coerce.boolean().default(false),
    NEXT_PUBLIC_GOOGLE_ENABLED: z.coerce.boolean().default(false),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_CAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
    NEXT_PUBLIC_CAPTCHA_ENABLED: process.env.NEXT_PUBLIC_CAPTCHA_ENABLED,
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
  },
});
```

---

### React Query — `apps/*/src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,          // 1 min default
        retry:     1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Browser singleton
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return makeQueryClient(); // SSR — new instance per request
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```

---

### `packages/auth/src/index.ts` — public API actualizada

```typescript
// Domain
export type { AuthError, AuthState, Role, Session, SignUpResult, TRoleCode, TUserStatusEnum, User } from './domain/auth.model';
export { hasAnyPermission, hasPermission, hasRole, isAdmin, roleCodes, userStatus, userStatusEnumObject } from './domain/auth.model';

// Client (use only in browser/client components)
export { authClient } from './client/better-auth.client';

// Mutations
export { signInMutation }         from './mutations/sign-in.mutation';
export { signUpMutation }         from './mutations/sign-up.mutation';
export { signOutMutation }        from './mutations/sign-out.mutation';
export { forgetPasswordMutation } from './mutations/forget-password.mutation';
export { resetPasswordMutation }  from './mutations/reset-password.mutation';
export { verifyEmailMutation }    from './mutations/verify-email.mutation';
export { sendVerificationMutation } from './mutations/send-verification.mutation';

// Query options
export { sessionQueryOptions } from './queries/session.query';

// Hooks (client-only)
export { useSession }        from './hooks/use-session';
export { useSignIn }         from './hooks/use-sign-in';
export { useSignUp }         from './hooks/use-sign-up';
export { useSignOut }        from './hooks/use-sign-out';
export { useForgetPassword } from './hooks/use-forget-password';
export { useResetPassword }  from './hooks/use-reset-password';

// Components
export { RequireAdmin, RequireAllPermissions, RequireAnyPermission, RequirePermission, RequireRole } from './components/roleGuards';

// Legacy hooks (keep until migration)
export { getDefaultPathByRole, useAdminGuard, useAnyPermission, useAuthGuard, useHasRole, useIsAdmin, usePermission, useRole, useRoleRedirect } from './hooks';
```

---

## Acceptance Criteria

- [ ] `@repo/utils` exporta `Safe<T>`, `ok()`, `err()`, `trySafe()`
- [ ] `@repo/auth` exporta `authClient`, todas las mutations y `sessionQueryOptions`
- [ ] `useSession()` retorna `{ session: null, isAuthenticated: false }` cuando no hay sesión
- [ ] `useSession()` retorna `{ session: {...}, isAuthenticated: true }` con sesión activa
- [ ] `useSignIn()` retorna `{ ok: false, error: 'INVALID_EMAIL_OR_PASSWORD' }` con credenciales malas
- [ ] Session invalidation: `signOut` → `session` vuelve a `null` en el mismo render cycle
- [ ] `npx turbo typecheck` pasa en `packages/auth` y ambas apps
- [ ] `NEXT_PUBLIC_API_URL` faltante → error en build time (no en runtime)
- [ ] `better-auth` es dependency de `packages/auth`, no de las apps directamente

---

## Notas de implementación

- **`better-auth/react` vs `better-auth/client`:** Usar `better-auth/react` — expone `useSession` nativo. Nuestro `useSession` wrappea el de BA para adaptar el shape al `Session` de `@repo/auth/domain`.
- **Cookies HTTPOnly:** Better Auth maneja toda la lógica de cookies. El cliente no necesita interceptores de axios ni headers de Authorization — simplemente hace fetch con `credentials: 'include'`.
- **`baseURL`:** Debe ser la URL base del API (`NEXT_PUBLIC_API_URL`). Better Auth concatena `basePath` internamente.
- **SSR:** `useSession` solo se usa en Client Components (`'use client'`). Para RSC, usar `sessionQueryOptions` con un Server-side fetch a `/api/v1/auth/session`.
- **Mantener hooks legacy:** `useAuthGuard`, `useAdminGuard`, etc. se actualizan para depender del nuevo `useSession` pero se mantienen en el mismo export path para no romper imports existentes.
- **`better-auth` package version:** Debe coincidir exactamente con la del backend (`apps/api`). Revisar antes de instalar.
