/**
 * Auth domain models for admin
 * Re-exports types from @repo/auth
 */

export type { Role, Session, User } from '@repo/auth';
export { hasPermission, hasRole, isAdmin } from '@repo/auth';
