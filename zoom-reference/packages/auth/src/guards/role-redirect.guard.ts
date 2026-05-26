import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import type { User } from '../domain/auth.model';

/**
 * Factory for a guard that redirects users who don't satisfy a role predicate.
 * Full role typing is wired in E-002 once roles are added to the User model.
 *
 * Usage:
 *   { path: 'admin', canActivate: [roleRedirectGuard(
 *       () => authService.currentUser(),
 *       (u) => u.someRoleField === 'admin',
 *       ['/dashboard']
 *   )] }
 */
export function roleRedirectGuard(
  getUser: () => User | null | undefined,
  hasRequiredRole: (user: User) => boolean,
  redirectTo: string[] = ['/login']
): CanActivateFn {
  return () => {
    const router = inject(Router);
    const user = getUser();
    if (!user || !hasRequiredRole(user)) {
      return router.createUrlTree(redirectTo);
    }
    return true;
  };
}
