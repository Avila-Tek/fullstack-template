'use client';

import type { ReactNode } from 'react';
import type { User } from '../domain/auth.model';
import {
  hasPermission as checkPermission,
  hasRole as checkRole,
} from '../domain/auth.model';

interface RequireRoleProps {
  user: User | null | undefined;
  role: 'USER' | 'ADMIN';
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the specified role
 * Usage:
 * <RequireRole user={currentUser} role="ADMIN">
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({
  user,
  role,
  children,
  fallback = null,
}: RequireRoleProps) {
  const hasRole = checkRole(user, role);

  if (!hasRole) {
    return fallback;
  }

  return children;
}

interface RequirePermissionProps {
  user: User | null | undefined;
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has the specified permission
 * Usage:
 * <RequirePermission user={currentUser} permission="admin:access">
 *   <AdminButton />
 * </RequirePermission>
 */
export function RequirePermission({
  user,
  permission,
  children,
  fallback = null,
}: RequirePermissionProps) {
  const hasPermission = checkPermission(user, permission);

  if (!hasPermission) {
    return fallback;
  }

  return children;
}

interface RequireAnyPermissionProps {
  user: User | null | undefined;
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that renders children if user has ANY of the specified permissions
 * Usage:
 * <RequireAnyPermission user={currentUser} permissions={['user:create', 'user:admin:create']}>
 *   <CreateUserButton />
 * </RequireAnyPermission>
 */
export function RequireAnyPermission({
  user,
  permissions,
  children,
  fallback = null,
}: RequireAnyPermissionProps) {
  const hasAnyPermission = permissions.some((p) => checkPermission(user, p));

  if (!hasAnyPermission) {
    return fallback;
  }

  return children;
}

interface RequireAllPermissionsProps {
  user: User | null | undefined;
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user has ALL of the specified permissions
 * Usage:
 * <RequireAllPermissions user={currentUser} permissions={['user:read:any', 'user:update:any']}>
 *   <UserManager />
 * </RequireAllPermissions>
 */
export function RequireAllPermissions({
  user,
  permissions,
  children,
  fallback = null,
}: RequireAllPermissionsProps) {
  const hasAllPermissions = permissions.every((p) => checkPermission(user, p));

  if (!hasAllPermissions) {
    return fallback;
  }

  return children;
}

interface RequireAdminProps {
  user: User | null | undefined;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that only renders children if user is an admin
 * Usage:
 * <RequireAdmin user={currentUser}>
 *   <AdminDashboard />
 * </RequireAdmin>
 */
export function RequireAdmin({
  user,
  children,
  fallback = null,
}: RequireAdminProps) {
  const isAdmin = user?.role?.code === 'ADMIN';

  if (!isAdmin) {
    return fallback;
  }

  return children;
}
