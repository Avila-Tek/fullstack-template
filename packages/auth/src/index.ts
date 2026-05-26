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
