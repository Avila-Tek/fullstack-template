# F1-Frontend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `better-auth/react` client into `@repo/auth`, update the shared `Session`/`User` domain types, rewrite the per-app auth services to use the BA client instead of `@repo/services`, and add Zod-validated `env.ts` to both frontend apps.

**Architecture:** `@repo/auth` is the shared package that owns the BA client singleton, `sessionQueryOptions`, and `useSession`. Each app's `features/auth/infrastructure/auth.service.ts` is rewritten to call `authClient` directly instead of going through the old `@repo/services` API client. Domain models in `@repo/auth` are updated to match what BA actually returns (cookie-based, no JWT tokens).

**Tech Stack:** better-auth ^1.6.11, @tanstack/react-query ^5, Next.js 15 App Router, TypeScript strict, @t3-oss/env-nextjs

---

## Pre-flight

Before touching any code, run typecheck to get a baseline:

```bash
npx turbo typecheck 2>&1 | tail -20
```

Note any existing errors — you're not responsible for fixing pre-existing failures, only for not introducing new ones.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `packages/auth/src/client/better-auth.client.ts` | Singleton `authClient` via `createAuthClient()` |
| `packages/auth/src/queries/session.query.ts` | `sessionQueryOptions` — shared React Query options |
| `packages/auth/src/hooks/use-session.ts` | `useSession()` hook — wraps BA's session state |

### Modified files
| File | Change |
|---|---|
| `packages/auth/package.json` | Add `better-auth` dependency |
| `packages/auth/src/domain/auth.model.ts` | `Session` → remove tokens, add `sessionId`/`expiresAt`; `User` fields become optional where BA doesn't return them |
| `packages/auth/src/hooks/index.ts` | Export `useSession` |
| `packages/auth/src/index.ts` | Export `authClient`, `sessionQueryOptions`, `useSession` |
| `apps/client/src/features/auth/infrastructure/auth.interfaces.ts` | Remove JWT token fields from DTOs |
| `apps/client/src/features/auth/infrastructure/auth.transform.ts` | Map BA session shape → domain `Session` |
| `apps/client/src/features/auth/infrastructure/auth.service.ts` | Use `authClient` instead of `AuthApi` |
| `apps/client/src/features/auth/infrastructure/index.ts` | Re-export updated `AuthService` |
| `apps/client/src/features/auth/application/mutations/useLogin.mutation.ts` | Adjust return type |
| `apps/client/src/features/auth/application/mutations/useSignUp.mutation.ts` | Adjust return type |
| `apps/client/src/middleware.ts` | Fix cookie name to match `COOKIE_PREFIX` |
| `apps/admin/src/features/auth/infrastructure/auth.interfaces.ts` | Remove JWT token fields |
| `apps/admin/src/features/auth/infrastructure/auth.transform.ts` | Map BA shape |
| `apps/admin/src/features/auth/infrastructure/auth.service.ts` | Use `authClient` |
| `apps/admin/src/features/auth/infrastructure/index.ts` | Re-export |
| `apps/admin/src/features/auth/application/mutations/useLogin.mutation.ts` | Adjust return type |

### New app files
| File | Responsibility |
|---|---|
| `apps/client/src/env.ts` | Zod-validated env via `@t3-oss/env-nextjs` |
| `apps/admin/src/env.ts` | Zod-validated env via `@t3-oss/env-nextjs` |

---

## Task 1: Install better-auth in @repo/auth and create the client

**Files:**
- Modify: `packages/auth/package.json`
- Create: `packages/auth/src/client/better-auth.client.ts`

- [ ] **Step 1: Add better-auth dependency**

Edit `packages/auth/package.json` — add to `dependencies`:

```json
{
  "name": "@repo/auth",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./domain": "./src/domain/auth.model.ts",
    "./hooks": "./src/hooks/index.ts",
    "./components": "./src/components/roleGuards.tsx"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "next": ">=14.0.0",
    "react": ">=18.0.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "@types/node": "24.3.0",
    "@types/react": "19.1.11",
    "typescript": "5.9.2"
  },
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0",
    "next": ">=14.0.0",
    "react": ">=18.0.0"
  },
  "dependencies": {
    "@repo/utils": "*",
    "better-auth": "^1.6.11"
  }
}
```

- [ ] **Step 2: Install the dependency**

Run from the monorepo root:

```bash
npm install --workspace=packages/auth
```

Expected: no errors, `packages/auth/node_modules` gets `better-auth`.

- [ ] **Step 3: Create the auth client**

Create `packages/auth/src/client/better-auth.client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';

/**
 * Shared better-auth browser client.
 * Used by both apps/client and apps/admin via @repo/auth.
 *
 * baseURL must be the API root (e.g. http://localhost:3000).
 * better-auth appends its basePath (/api/v1/auth) internally.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  fetchOptions: {
    // Forward browser locale to get translated error messages from the API
    headers:
      typeof navigator !== 'undefined'
        ? { 'Accept-Language': navigator.language }
        : { 'Accept-Language': 'es' },
  },
});
```

- [ ] **Step 4: Verify types**

```bash
npm -C packages/auth run typecheck
```

Expected: 0 errors from the new file. (Ignore pre-existing errors if any.)

- [ ] **Step 5: Commit**

```bash
git add packages/auth/package.json packages/auth/src/client/better-auth.client.ts
git commit -m "feat(@repo/auth): add better-auth client singleton"
```

---

## Task 2: Update Session and User domain types

**Files:**
- Modify: `packages/auth/src/domain/auth.model.ts`

**Context:** Better Auth's `getSession()` returns a user without `firstName`/`lastName`/`role`/`status`. These fields will come from backend extensions in F3/F7. We make them optional to avoid breaking existing code while matching what BA actually provides today.

- [ ] **Step 1: Rewrite the domain model**

Replace the full contents of `packages/auth/src/domain/auth.model.ts`:

```typescript
import { getEnumObjectFromArray } from '@repo/utils';

export const userStatus = ['active', 'inactive'] as const;
export type TUserStatusEnum = (typeof userStatus)[number];
export const userStatusEnumObject = getEnumObjectFromArray(userStatus);

export const roleCodes = ['USER', 'ADMIN'] as const;
export type TRoleCode = (typeof roleCodes)[number];

export interface Role {
  id: string;
  code: TRoleCode;
  name: string;
  permissions: string[];
}

/**
 * Application User — aligned with Better Auth's session endpoint response.
 *
 * Fields present in every BA response: id, email, name, emailVerified, image, createdAt, updatedAt.
 * Fields marked optional are not yet returned by BA; they will be populated once the backend
 * adds custom user fields in F3 / F7.
 */
export interface User {
  id: string;
  email: string;
  /** Full display name returned by Better Auth ("John Doe") */
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields — optional until backend adds them
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string;
  status?: TUserStatusEnum;
  role?: Role | null;
}

/**
 * Active session — cookie-based (Better Auth).
 * No JWT tokens are stored in the browser. The session is maintained via
 * an HTTPOnly cookie managed by Better Auth.
 */
export interface Session {
  user: User;
  sessionId: string;
  expiresAt: Date;
}

export interface AuthError {
  code: string;
  message: string;
}

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'loading' }
  | { status: 'authenticated'; session: Session };

export interface SignUpResult {
  requiresEmailVerification: true;
}

// ── Permission utilities ────────────────────────────────────────────────────

export function hasPermission(
  user: User | null | undefined,
  permissionCode: string
): boolean {
  if (!user?.role) return false;
  return user.role.permissions.includes(permissionCode);
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissionCodes: string[]
): boolean {
  if (!user?.role) return false;
  return permissionCodes.some((code) => user.role!.permissions.includes(code));
}

export function hasRole(
  user: User | null | undefined,
  roleCode: TRoleCode
): boolean {
  return user?.role?.code === roleCode;
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, 'ADMIN');
}
```

- [ ] **Step 2: Verify types**

```bash
npm -C packages/auth run typecheck
```

Expected: 0 errors. If `roleGuards.tsx` or `useRole.ts` now show errors, they reference optional `role` — verify they already use optional chaining (`user?.role`). They do; no fix needed.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/domain/auth.model.ts
git commit -m "feat(@repo/auth): update Session/User types for better-auth cookie flow"
```

---

## Task 3: Add sessionQueryOptions

**Files:**
- Create: `packages/auth/src/queries/session.query.ts`

- [ ] **Step 1: Create the query file**

Create `packages/auth/src/queries/session.query.ts`:

```typescript
import { queryOptions } from '@tanstack/react-query';
import type { Session } from '../domain/auth.model';
import { authClient } from '../client/better-auth.client';

/**
 * React Query options for the active session.
 *
 * staleTime matches the BA cookie cache maxAge (5 min) — avoids redundant
 * GET /auth/session fetches while the cookie cache is warm.
 *
 * retry: false — a 401 is not a transient error; retrying makes the UX
 * flicker unnecessarily.
 */
export const sessionQueryOptions = () =>
  queryOptions<Session | null>({
    queryKey: ['auth', 'session'],
    queryFn: async (): Promise<Session | null> => {
      const result = await authClient.getSession();
      if (!result.data?.session || !result.data?.user) return null;

      const { session, user } = result.data;
      return {
        sessionId:  session.id,
        expiresAt:  new Date(session.expiresAt),
        user: {
          id:            user.id,
          email:         user.email,
          name:          user.name,
          emailVerified: user.emailVerified,
          image:         user.image ?? null,
          createdAt:     new Date(user.createdAt),
          updatedAt:     new Date(user.updatedAt),
        },
      };
    },
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime:    1000 * 60 * 10, // 10 minutes
    retry:     false,
  });
```

- [ ] **Step 2: Typecheck**

```bash
npm -C packages/auth run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/queries/session.query.ts
git commit -m "feat(@repo/auth): add sessionQueryOptions"
```

---

## Task 4: Add useSession hook

**Files:**
- Create: `packages/auth/src/hooks/use-session.ts`
- Modify: `packages/auth/src/hooks/index.ts`

- [ ] **Step 1: Create use-session.ts**

Create `packages/auth/src/hooks/use-session.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import type { Session } from '../domain/auth.model';
import { sessionQueryOptions } from '../queries/session.query';

export interface UseSessionResult {
  session:         Session | null;
  isAuthenticated: boolean;
  isPending:       boolean;
  isError:         boolean;
}

/**
 * Returns the current session from React Query cache.
 *
 * Note: requires QueryClientProvider to be present in the component tree.
 * Use sessionQueryOptions() directly in Server Components (prefetch/dehydrate).
 */
export function useSession(): UseSessionResult {
  const query = useQuery(sessionQueryOptions());

  return {
    session:         query.data ?? null,
    isAuthenticated: query.data !== null && query.data !== undefined,
    isPending:       query.isPending,
    isError:         query.isError,
  };
}
```

- [ ] **Step 2: Add to hooks/index.ts**

The file currently exports from `useRole` and `useRoleRedirect`. Append:

```typescript
export { useSession } from './use-session.js';
```

Current file `packages/auth/src/hooks/index.ts`:
```typescript
export {
  useAnyPermission,
  useHasRole,
  useIsAdmin,
  usePermission,
  useRole,
} from './useRole';

export {
  getDefaultPathByRole,
  useAdminGuard,
  useAuthGuard,
  useRoleRedirect,
} from './useRoleRedirect';
```

Updated:
```typescript
export {
  useAnyPermission,
  useHasRole,
  useIsAdmin,
  usePermission,
  useRole,
} from './useRole';

export {
  getDefaultPathByRole,
  useAdminGuard,
  useAuthGuard,
  useRoleRedirect,
} from './useRoleRedirect';

export { useSession } from './use-session';
```

- [ ] **Step 3: Typecheck**

```bash
npm -C packages/auth run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/auth/src/hooks/use-session.ts packages/auth/src/hooks/index.ts
git commit -m "feat(@repo/auth): add useSession hook"
```

---

## Task 5: Update @repo/auth public API (index.ts)

**Files:**
- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Update index.ts**

Replace full contents of `packages/auth/src/index.ts`:

```typescript
// ── Domain types + utilities ──────────────────────────────────────────────
export type {
  AuthError,
  AuthState,
  Role,
  Session,
  SignUpResult,
  TRoleCode,
  TUserStatusEnum,
  User,
} from './domain/auth.model';
export {
  hasAnyPermission,
  hasPermission,
  hasRole,
  isAdmin,
  roleCodes,
  userStatus,
  userStatusEnumObject,
} from './domain/auth.model';

// ── Better Auth client (browser-only) ────────────────────────────────────
export { authClient } from './client/better-auth.client';

// ── React Query ───────────────────────────────────────────────────────────
export { sessionQueryOptions } from './queries/session.query';

// ── Hooks ─────────────────────────────────────────────────────────────────
export {
  getDefaultPathByRole,
  useAdminGuard,
  useAnyPermission,
  useAuthGuard,
  useHasRole,
  useIsAdmin,
  usePermission,
  useRole,
  useRoleRedirect,
  useSession,
} from './hooks';

// ── Components ────────────────────────────────────────────────────────────
export {
  RequireAdmin,
  RequireAllPermissions,
  RequireAnyPermission,
  RequirePermission,
  RequireRole,
} from './components/roleGuards';
```

- [ ] **Step 2: Typecheck**

```bash
npm -C packages/auth run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "feat(@repo/auth): export authClient, sessionQueryOptions, useSession"
```

---

## Task 6: Rewrite apps/client auth service

**Files:**
- Modify: `apps/client/src/features/auth/infrastructure/auth.interfaces.ts`
- Modify: `apps/client/src/features/auth/infrastructure/auth.transform.ts`
- Modify: `apps/client/src/features/auth/infrastructure/auth.service.ts`
- Modify: `apps/client/src/features/auth/infrastructure/index.ts`

**Context:** The current service wraps `api.v1.auth` (from `@repo/services`) which uses JWT token responses. We replace it with direct `authClient` calls. The class is kept (clean DI boundary, easy to mock in tests) but removes the injected `AuthApi` parameter.

- [ ] **Step 1: Update auth.interfaces.ts**

Replace `apps/client/src/features/auth/infrastructure/auth.interfaces.ts`:

```typescript
/**
 * Better Auth DTO shapes — what the BA client actually returns.
 * These are internal to the infrastructure layer; domain types live in auth.model.ts.
 */

export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: string | Date;
  token?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BetterAuthSessionResponse {
  session: BetterAuthSession;
  user: BetterAuthUser;
}

/** Input shapes (used by forms → service) */
export interface SignInInput {
  email: string;
  password: string;
  callbackURL?: string;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  callbackURL?: string;
}

export interface ForgetPasswordInput {
  email: string;
  redirectTo: string;
}

export interface ResetPasswordInput {
  newPassword: string;
  token: string;
}

export interface VerifyEmailInput {
  token: string;
}
```

- [ ] **Step 2: Update auth.transform.ts**

Replace `apps/client/src/features/auth/infrastructure/auth.transform.ts`:

```typescript
import type { Session, User } from '../domain/auth.model';
import type { BetterAuthSessionResponse, BetterAuthUser } from './auth.interfaces';

export function toUserDomain(dto: BetterAuthUser): User {
  return {
    id:            dto.id,
    email:         dto.email,
    name:          dto.name,
    emailVerified: dto.emailVerified,
    image:         dto.image ?? null,
    createdAt:     dto.createdAt instanceof Date ? dto.createdAt : new Date(dto.createdAt),
    updatedAt:     dto.updatedAt instanceof Date ? dto.updatedAt : new Date(dto.updatedAt),
  };
}

export function toSessionDomain(dto: BetterAuthSessionResponse): Session {
  return {
    sessionId: dto.session.id,
    expiresAt: dto.session.expiresAt instanceof Date
      ? dto.session.expiresAt
      : new Date(dto.session.expiresAt),
    user: toUserDomain(dto.user),
  };
}
```

- [ ] **Step 3: Rewrite auth.service.ts**

Replace `apps/client/src/features/auth/infrastructure/auth.service.ts`:

```typescript
import { authClient } from '@repo/auth';
import type { Session } from '@repo/auth';
import type {
  ForgetPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  VerifyEmailInput,
} from './auth.interfaces';
import { toSessionDomain } from './auth.transform';

/**
 * AuthServiceClass wraps better-auth client calls with domain error handling.
 * All methods throw an Error with the backend-translated message on failure.
 * The session is established via HTTPOnly cookie — signIn does NOT return tokens.
 */
export class AuthServiceClass {
  async signIn(input: SignInInput): Promise<Session> {
    const result = await authClient.signIn.email({
      email:       input.email,
      password:    input.password,
      callbackURL: input.callbackURL,
    });
    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Sign in failed');
    }
    return toSessionDomain({
      session: result.data.session,
      user:    result.data.user,
    });
  }

  async signUp(input: SignUpInput): Promise<{ requiresEmailVerification: true }> {
    const result = await authClient.signUp.email({
      email:       input.email,
      password:    input.password,
      name:        input.name,
      callbackURL: input.callbackURL,
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign up failed');
    }
    return { requiresEmailVerification: true };
  }

  async signOut(): Promise<void> {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign out failed');
    }
  }

  async forgetPassword(input: ForgetPasswordInput): Promise<void> {
    const result = await authClient.forgetPassword({
      email:      input.email,
      redirectTo: input.redirectTo,
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to send reset email');
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const result = await authClient.resetPassword({
      newPassword: input.newPassword,
      token:       input.token,
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Password reset failed');
    }
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const result = await authClient.verifyEmail({ query: { token: input.token } });
    if (result.error) {
      throw new Error(result.error.message ?? 'Email verification failed');
    }
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const result = await authClient.sendVerificationEmail({ email, callbackURL: '/auth/email-verified' });
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to send verification email');
    }
  }
}

export const AuthService = new AuthServiceClass();
```

- [ ] **Step 4: Update index.ts**

Replace `apps/client/src/features/auth/infrastructure/index.ts`:

```typescript
export { AuthService, AuthServiceClass } from './auth.service';
```

- [ ] **Step 5: Typecheck the client app**

```bash
npm -C apps/client run typecheck 2>&1 | head -40
```

Fix any errors before proceeding. Common issues:
- Other files still importing `accessToken`/`refreshToken` from `Session` — remove those references
- `TSignInInput` from `@repo/schemas` used in mutation — keep for now; we'll update in Task 7
- `auth.form.ts` might reference old schema shapes — update form types if needed

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/features/auth/infrastructure/
git commit -m "feat(client): replace auth service with better-auth client"
```

---

## Task 7: Update apps/client auth mutation hooks

**Files:**
- Modify: `apps/client/src/features/auth/application/mutations/useLogin.mutation.ts`
- Modify: `apps/client/src/features/auth/application/mutations/useSignUp.mutation.ts`
- Modify: `apps/client/src/features/auth/application/useCases/login.useCase.ts`
- Modify: `apps/client/src/features/auth/application/useCases/signUp.useCase.ts`

**Context:** The mutations now return updated types. `useSignIn` invalidates the session query on success so `useSession()` automatically refetches.

- [ ] **Step 1: Update useLogin.mutation.ts**

Replace `apps/client/src/features/auth/application/mutations/useLogin.mutation.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@repo/auth';
import { AuthService } from '../../infrastructure';
import type { SignInInput } from '../../infrastructure/auth.interfaces';

export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation<Session, Error, SignInInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
    onSuccess: () => {
      // Session cookie is set by the server; invalidate React Query cache
      // so useSession() picks up the new session on next render.
      void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
```

- [ ] **Step 2: Update useSignUp.mutation.ts**

Replace `apps/client/src/features/auth/application/mutations/useSignUp.mutation.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '../../infrastructure';
import type { SignUpInput } from '../../infrastructure/auth.interfaces';

export type SignUpResult = { requiresEmailVerification: true };

export function useSignUpMutation() {
  return useMutation<SignUpResult, Error, SignUpInput>({
    mutationKey: ['auth', 'signUp'],
    mutationFn: (input) => AuthService.signUp(input),
  });
}
```

- [ ] **Step 3: Update login.useCase.ts**

Replace `apps/client/src/features/auth/application/useCases/login.useCase.ts`:

```typescript
import type { Session } from '@repo/auth';
import type { SignInInput } from '../../infrastructure/auth.interfaces';
import { useSignInMutation } from '../mutations/useLogin.mutation';

type SignInResult =
  | { success: true; session: Session }
  | { success: false; message: string };

type Dependencies = {
  signIn: (input: SignInInput) => Promise<Session>;
};

export async function signInUseCase(
  input: SignInInput,
  deps: Dependencies
): Promise<SignInResult> {
  try {
    const session = await deps.signIn(input);
    return { success: true, session };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign in failed';
    return { success: false, message };
  }
}

export function useSignIn() {
  const mutation = useSignInMutation();

  return {
    mutateAsync: (input: SignInInput) =>
      signInUseCase(input, { signIn: mutation.mutateAsync }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

- [ ] **Step 4: Update signUp.useCase.ts**

Replace `apps/client/src/features/auth/application/useCases/signUp.useCase.ts`:

```typescript
import type { SignUpInput } from '../../infrastructure/auth.interfaces';
import { useSignUpMutation, type SignUpResult } from '../mutations/useSignUp.mutation';

type SignUpUseCaseResult =
  | { success: true; result: SignUpResult }
  | { success: false; message: string };

type Dependencies = {
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
};

export async function signUpUseCase(
  input: SignUpInput,
  deps: Dependencies
): Promise<SignUpUseCaseResult> {
  try {
    const result = await deps.signUp(input);
    return { success: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sign up failed';
    return { success: false, message };
  }
}

export function useSignUp() {
  const mutation = useSignUpMutation();

  return {
    mutateAsync: (input: SignUpInput) =>
      signUpUseCase(input, { signUp: mutation.mutateAsync }),
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
```

- [ ] **Step 5: Typecheck**

```bash
npm -C apps/client run typecheck 2>&1 | head -40
```

Fix any remaining errors before continuing. Common causes:
- Other use cases still referencing `TSignInInput` from `@repo/schemas` — replace with `SignInInput` from `auth.interfaces`
- Other mutations still using old `Session` shape — update to match new shape

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/features/auth/application/
git commit -m "feat(client): update auth mutations for better-auth cookie flow"
```

---

## Task 8: Update apps/client middleware

**Files:**
- Modify: `apps/client/src/middleware.ts`
- Modify: `apps/client/src/lib/authMiddleware.ts`

**Context:** The cookie name is `app.session_token` (matches `COOKIE_PREFIX=app` in backend env). The current `authMiddleware.ts` reads from `cookieKeysEnumObject['better_auth.session_token']` — this may not match. We standardize on the actual cookie name.

- [ ] **Step 1: Update authMiddleware.ts**

Replace `apps/client/src/lib/authMiddleware.ts`:

```typescript
import type { NextRequest } from 'next/server';

/**
 * Cookie name must match COOKIE_PREFIX in apps/api/.env.
 * Format: {COOKIE_PREFIX}.session_token
 * Default prefix is 'app', yielding 'app.session_token'.
 *
 * If you change COOKIE_PREFIX on the backend, update this constant.
 */
const SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? 'app.session_token';

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function isAuthenticated(request: NextRequest): boolean {
  return !!getSessionToken(request);
}
```

- [ ] **Step 2: Update middleware.ts**

Replace `apps/client/src/middleware.ts`:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from './lib/authMiddleware';

const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/email-verified',
  '/auth/check-email',
];

const PUBLIC_ROUTES = [...AUTH_ROUTES, '/api'];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  // Authenticated users cannot visit auth routes (e.g. /auth/login)
  if (isAuthRoute(pathname) && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated users cannot visit protected routes
  if (!isPublicRoute(pathname) && !authenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
```

- [ ] **Step 3: Add NEXT_PUBLIC_SESSION_COOKIE_NAME to .env.local**

Create or update `apps/client/.env.local` (do NOT commit this file — it's in .gitignore):

```
NEXT_PUBLIC_SESSION_COOKIE_NAME=app.session_token
```

- [ ] **Step 4: Typecheck**

```bash
npm -C apps/client run typecheck 2>&1 | grep -E "error|Error" | head -10
```

Expected: no new type errors from the middleware files.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/middleware.ts apps/client/src/lib/authMiddleware.ts
git commit -m "feat(client): update middleware to use better-auth cookie name"
```

---

## Task 9: Rewrite apps/admin auth service

**Files:**
- Modify: `apps/admin/src/features/auth/infrastructure/auth.interfaces.ts`
- Modify: `apps/admin/src/features/auth/infrastructure/auth.transform.ts`
- Modify: `apps/admin/src/features/auth/infrastructure/auth.service.ts`
- Modify: `apps/admin/src/features/auth/infrastructure/index.ts`
- Modify: `apps/admin/src/features/auth/application/mutations/useLogin.mutation.ts`

**Context:** Same migration as Task 6+7 but admin only has signIn/signOut.

- [ ] **Step 1: Update auth.interfaces.ts (admin)**

Replace `apps/admin/src/features/auth/infrastructure/auth.interfaces.ts`:

```typescript
export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BetterAuthSession {
  id: string;
  userId: string;
  expiresAt: string | Date;
}

export interface BetterAuthSessionResponse {
  session: BetterAuthSession;
  user: BetterAuthUser;
}

export interface SignInInput {
  email: string;
  password: string;
  callbackURL?: string;
}
```

- [ ] **Step 2: Update auth.transform.ts (admin)**

Replace `apps/admin/src/features/auth/infrastructure/auth.transform.ts`:

```typescript
import type { Session, User } from '@repo/auth';
import type { BetterAuthSessionResponse, BetterAuthUser } from './auth.interfaces';

export function toUserDomain(dto: BetterAuthUser): User {
  return {
    id:            dto.id,
    email:         dto.email,
    name:          dto.name,
    emailVerified: dto.emailVerified,
    image:         dto.image ?? null,
    createdAt:     dto.createdAt instanceof Date ? dto.createdAt : new Date(dto.createdAt),
    updatedAt:     dto.updatedAt instanceof Date ? dto.updatedAt : new Date(dto.updatedAt),
  };
}

export function toSessionDomain(dto: BetterAuthSessionResponse): Session {
  return {
    sessionId: dto.session.id,
    expiresAt: dto.session.expiresAt instanceof Date
      ? dto.session.expiresAt
      : new Date(dto.session.expiresAt),
    user: toUserDomain(dto.user),
  };
}
```

- [ ] **Step 3: Rewrite auth.service.ts (admin)**

Replace `apps/admin/src/features/auth/infrastructure/auth.service.ts`:

```typescript
import { authClient } from '@repo/auth';
import type { Session } from '@repo/auth';
import type { SignInInput } from './auth.interfaces';
import { toSessionDomain } from './auth.transform';

export class AuthServiceClass {
  async signIn(input: SignInInput): Promise<Session> {
    const result = await authClient.signIn.email({
      email:       input.email,
      password:    input.password,
      callbackURL: input.callbackURL,
    });
    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Sign in failed');
    }
    return toSessionDomain({
      session: result.data.session,
      user:    result.data.user,
    });
  }

  async signOut(): Promise<void> {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign out failed');
    }
  }
}

export const AuthService = new AuthServiceClass();
```

- [ ] **Step 4: Update index.ts (admin)**

Replace `apps/admin/src/features/auth/infrastructure/index.ts`:

```typescript
export { AuthService, AuthServiceClass } from './auth.service';
```

- [ ] **Step 5: Update useLogin.mutation.ts (admin)**

Replace `apps/admin/src/features/auth/application/mutations/useLogin.mutation.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@repo/auth';
import { AuthService } from '../../infrastructure';
import type { SignInInput } from '../../infrastructure/auth.interfaces';

export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation<Session, Error, SignInInput>({
    mutationKey: ['auth', 'signIn'],
    mutationFn: (input) => AuthService.signIn(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
}
```

- [ ] **Step 6: Typecheck admin**

```bash
npm -C apps/admin run typecheck 2>&1 | head -40
```

Fix errors. Common: admin login page still references `accessToken` or old `Session` shape — update to read `session.user.name` or `session.sessionId`.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/auth/
git commit -m "feat(admin): replace auth service with better-auth client"
```

---

## Task 10: Add env.ts to apps/client

**Files:**
- Create: `apps/client/src/env.ts`

**Context:** `@t3-oss/env-nextjs` is already in `apps/client/package.json`. Currently `process.env.NEXT_PUBLIC_API_URL` is read directly without validation. This task adds the Zod-validated env object.

- [ ] **Step 1: Create env.ts**

Create `apps/client/src/env.ts`:

```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_API_URL:              z.string().url(),
    NEXT_PUBLIC_APP_NAME:             z.string().default('App'),
    NEXT_PUBLIC_SESSION_COOKIE_NAME:  z.string().default('app.session_token'),
    NEXT_PUBLIC_CAPTCHA_ENABLED:      z.coerce.boolean().default(false),
    NEXT_PUBLIC_CAPTCHA_SITE_KEY:     z.string().optional(),
    NEXT_PUBLIC_GOOGLE_ENABLED:       z.coerce.boolean().default(false),
  },
  runtimeEnv: {
    NODE_ENV:                         process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL:              process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME:             process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SESSION_COOKIE_NAME:  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME,
    NEXT_PUBLIC_CAPTCHA_ENABLED:      process.env.NEXT_PUBLIC_CAPTCHA_ENABLED,
    NEXT_PUBLIC_CAPTCHA_SITE_KEY:     process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
    NEXT_PUBLIC_GOOGLE_ENABLED:       process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
  },
});
```

- [ ] **Step 2: Update authMiddleware.ts to use env**

Update the `SESSION_COOKIE_NAME` constant in `apps/client/src/lib/authMiddleware.ts`:

```typescript
import type { NextRequest } from 'next/server';

// NOTE: cannot import from src/env.ts in middleware (runs at Edge Runtime).
// Read process.env directly; the value is baked at build time.
const SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? 'app.session_token';

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function isAuthenticated(request: NextRequest): boolean {
  return !!getSessionToken(request);
}
```

(No change needed if already set correctly in Task 8.)

- [ ] **Step 3: Add env vars to .env.local**

Ensure `apps/client/.env.local` contains:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp
NEXT_PUBLIC_SESSION_COOKIE_NAME=app.session_token
```

- [ ] **Step 4: Typecheck**

```bash
npm -C apps/client run typecheck 2>&1 | grep -E "^src" | head -10
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/env.ts
git commit -m "feat(client): add Zod-validated env.ts"
```

---

## Task 11: Add env.ts to apps/admin

**Files:**
- Create: `apps/admin/src/env.ts`

- [ ] **Step 1: Create env.ts**

Create `apps/admin/src/env.ts`:

```typescript
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  client: {
    NEXT_PUBLIC_API_URL:              z.string().url(),
    NEXT_PUBLIC_APP_NAME:             z.string().default('Admin'),
    NEXT_PUBLIC_SESSION_COOKIE_NAME:  z.string().default('app.session_token'),
    NEXT_PUBLIC_GOOGLE_ENABLED:       z.coerce.boolean().default(false),
  },
  runtimeEnv: {
    NODE_ENV:                         process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL:              process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME:             process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_SESSION_COOKIE_NAME:  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME,
    NEXT_PUBLIC_GOOGLE_ENABLED:       process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
  },
});
```

- [ ] **Step 2: Update admin middleware**

Replace `apps/admin/src/middleware.ts` to add session guard:

```typescript
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? 'app.session_token';

const AUTH_ROUTES = ['/auth/login', '/auth/forgot-password', '/auth/reset-password'];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  // Root → redirect to dashboard or login
  if (pathname === '/') {
    return NextResponse.redirect(new URL(
      authenticated ? '/dashboard' : '/auth/login',
      request.url
    ));
  }

  // Auth routes: redirect authenticated users away
  if (isAuthRoute(pathname) && authenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protected routes: redirect unauthenticated users
  if (!isAuthRoute(pathname) && !authenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
```

- [ ] **Step 3: Add .env.local for admin**

Create `apps/admin/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Admin
NEXT_PUBLIC_SESSION_COOKIE_NAME=app.session_token
```

- [ ] **Step 4: Typecheck admin**

```bash
npm -C apps/admin run typecheck 2>&1 | grep -E "^src" | head -10
```

Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/env.ts apps/admin/src/middleware.ts
git commit -m "feat(admin): add Zod-validated env.ts + session-aware middleware"
```

---

## Task 12: Full typecheck + lint pass

- [ ] **Step 1: Run turbo typecheck across the whole monorepo**

```bash
npx turbo typecheck 2>&1 | grep -E "error TS" | head -30
```

Fix any errors before proceeding. Typical remaining issues:
- Old use case files referencing `session.accessToken` — replace with `session.sessionId`
- Components rendering `{user.firstName}` — update to `{user.name}` (BA provides `name`, not split first/last)
- `TSignInInput` from `@repo/schemas` still used somewhere — replace with `SignInInput` from `auth.interfaces`

- [ ] **Step 2: Run turbo lint**

```bash
npx turbo lint 2>&1 | grep -E "error|warn" | grep -v "node_modules" | head -20
```

Fix lint errors. Warnings about `'use client'` and unused variables are the most common.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: F1-frontend — typecheck + lint clean"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `npx turbo typecheck` → 0 errors in `packages/auth`, `apps/client`, `apps/admin`
- [ ] `npx turbo lint` → 0 errors
- [ ] `packages/auth` exports `authClient`, `sessionQueryOptions`, `useSession`, `Session`, `User`
- [ ] `authClient` is instantiated with `NEXT_PUBLIC_API_URL`
- [ ] `useSession()` returns `{ session: null, isAuthenticated: false }` when no session cookie
- [ ] `useSignInMutation.onSuccess` calls `queryClient.invalidateQueries(['auth', 'session'])`
- [ ] `Session` type has `sessionId` and `expiresAt`, no `accessToken`/`refreshToken`
- [ ] Both apps' middleware redirects unauthenticated requests to `/auth/login`
- [ ] `apps/client/src/env.ts` validates `NEXT_PUBLIC_API_URL` — missing it at build time throws

## Manual smoke test (after running both apps)

```bash
# Terminal 1 — start API
npm -C apps/api run start:dev

# Terminal 2 — start client
npm -C apps/client run dev

# Terminal 3 — start admin
npm -C apps/admin run dev
```

1. Open http://localhost:3002/auth/login — see login page (no infinite redirect)
2. Try to open http://localhost:3002/dashboard — get redirected to /auth/login
3. Open http://localhost:3001/auth/login — see admin login page
4. Open http://localhost:3001/dashboard — get redirected to /auth/login
