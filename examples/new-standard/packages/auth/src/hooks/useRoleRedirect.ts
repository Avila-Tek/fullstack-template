'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { User } from '../domain/auth.model';
import { isAdmin } from '../domain/auth.model';

interface UseRoleRedirectOptions {
  user: User | null | undefined;
  isLoading?: boolean;
  adminPath?: string;
  userPath?: string;
  fallbackPath?: string;
}

/**
 * Hook to redirect users based on their role
 * Usage:
 * // Redirect to role-specific dashboard after login
 * useRoleRedirect({
 *   user: currentUser,
 *   isLoading: isLoadingUser,
 *   adminPath: '/admin/dashboard',
 *   userPath: '/dashboard'
 * });
 */
export function useRoleRedirect({
  user,
  isLoading = false,
  adminPath = '/admin/dashboard',
  userPath = '/dashboard',
  fallbackPath = '/login',
}: UseRoleRedirectOptions) {
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push(fallbackPath);
      return;
    }

    if (isAdmin(user)) {
      router.push(adminPath);
    } else {
      router.push(userPath);
    }
  }, [user, isLoading, adminPath, userPath, fallbackPath, router]);
}

/**
 * Hook to protect admin routes
 * Usage:
 * // In an admin page component
 * useAdminGuard({
 *   user: currentUser,
 *   isLoading: isLoadingUser,
 *   redirectTo: '/login'
 * });
 */
export function useAdminGuard({
  user,
  isLoading = false,
  redirectTo = '/login',
}: {
  user: User | null | undefined;
  isLoading?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user || !isAdmin(user)) {
      router.push(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);
}

/**
 * Hook to protect authenticated routes
 * Usage:
 * // In a protected page component
 * useAuthGuard({
 *   user: currentUser,
 *   isLoading: isLoadingUser,
 *   redirectTo: '/login'
 * });
 */
export function useAuthGuard({
  user,
  isLoading = false,
  redirectTo = '/login',
}: {
  user: User | null | undefined;
  isLoading?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);
}

/**
 * Get the default path based on user role
 * Usage:
 * const defaultPath = getDefaultPathByRole(currentUser);
 * router.push(defaultPath);
 */
export function getDefaultPathByRole(
  user: User | null | undefined,
  options?: {
    adminPath?: string;
    userPath?: string;
    fallbackPath?: string;
  }
): string {
  const {
    adminPath = '/admin/dashboard',
    userPath = '/dashboard',
    fallbackPath = '/login',
  } = options || {};

  if (!user) return fallbackPath;

  if (isAdmin(user)) {
    return adminPath;
  }

  return userPath;
}
