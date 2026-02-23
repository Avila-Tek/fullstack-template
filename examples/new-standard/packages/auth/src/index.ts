// Domain types and utilities

// Components
export {
  RequireAdmin,
  RequireAllPermissions,
  RequireAnyPermission,
  RequirePermission,
  RequireRole,
} from './components/roleGuards';
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
// Hooks
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
} from './hooks';
