'use client';

import { useMemo } from 'react';
import type { User } from '../domain/auth.model';
import {
  hasAnyPermission,
  hasPermission,
  hasRole,
  isAdmin,
} from '../domain/auth.model';

/**
 * Hook to get role information from a user
 * Usage: const { role, isAdmin } = useRole(currentUser);
 */
export function useRole(user: User | null | undefined) {
  return useMemo(() => {
    return {
      role: user?.role ?? null,
      roleCode: user?.role?.code ?? null,
      permissions: user?.role?.permissions ?? [],
      isAdmin: isAdmin(user),
      isUser: hasRole(user, 'USER'),
      hasRole: (code: 'USER' | 'ADMIN') => hasRole(user, code),
    };
  }, [user]);
}

/**
 * Hook to check if user has a specific permission
 * Usage: const { hasPermission } = usePermission(currentUser, 'admin:access');
 */
export function usePermission(
  user: User | null | undefined,
  permissionCode: string
) {
  return useMemo(() => {
    return {
      hasPermission: hasPermission(user, permissionCode),
      allowed: hasPermission(user, permissionCode),
    };
  }, [user, permissionCode]);
}

/**
 * Hook to check if user has any of the specified permissions
 * Usage: const { hasAnyPermission } = useAnyPermission(currentUser, ['user:create', 'user:admin:create']);
 */
export function useAnyPermission(
  user: User | null | undefined,
  permissionCodes: string[]
) {
  return useMemo(() => {
    return {
      hasAnyPermission: hasAnyPermission(user, permissionCodes),
      allowed: hasAnyPermission(user, permissionCodes),
    };
  }, [user, permissionCodes]);
}

/**
 * Hook to check if user is admin
 * Usage: const isAdmin = useIsAdmin(currentUser);
 */
export function useIsAdmin(user: User | null | undefined) {
  return useMemo(() => {
    return isAdmin(user);
  }, [user]);
}

/**
 * Hook to check if user has a specific role
 * Usage: const isUser = useHasRole(currentUser, 'USER');
 */
export function useHasRole(
  user: User | null | undefined,
  roleCode: 'USER' | 'ADMIN'
) {
  return useMemo(() => {
    return hasRole(user, roleCode);
  }, [user, roleCode]);
}
