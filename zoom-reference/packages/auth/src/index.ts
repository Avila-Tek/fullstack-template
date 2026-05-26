export type { TBetterAuthSession, TGetSessionResponse } from '@zoom/schemas';
export { AppRequireRoleDirective } from './directives/require-role.directive';
export type {
  AuthError,
  AuthState,
  Session,
  SignUpResult,
  User,
} from './domain/auth.model';
export { adminGuard, authGuard } from './guards/auth.guard';
export { roleRedirectGuard } from './guards/role-redirect.guard';
export { createBetterAuthClient } from './infrastructure/betterAuthClient.factory';
export { RoleService } from './services/role.service';
