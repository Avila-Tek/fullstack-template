/**
 * Auth domain models for admin — re-exports from @repo/auth.
 *
 * Service input/output contracts are re-exported from @repo/schemas below.
 * Form types live in domain/auth.form.ts
 */

export type { AuthError, AuthState, Role, Session, User } from '@repo/auth';
export { hasAnyPermission, hasPermission, hasRole, isAdmin } from '@repo/auth';

// ── Service input/output contracts ──────────────────────────────────────────
// Sourced from @repo/schemas (single source of truth for endpoint shapes).
export type {
  TSignInEmailInput as SignInInput,
  TSignUpResult as SignUpResult,
} from '@repo/schemas';
