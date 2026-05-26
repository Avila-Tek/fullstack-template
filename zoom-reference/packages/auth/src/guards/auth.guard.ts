import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import type { User } from '../domain/auth.model';

/**
 * Factory for a guard that redirects unauthenticated users.
 *
 * Usage in routes:
 *   { path: 'dashboard', canActivate: [authGuard(() => authService.currentUser())] }
 */
export function authGuard(
  getUser: () => User | null | undefined,
  redirectTo = '/login'
): CanActivateFn {
  return () => {
    const router = inject(Router);
    const user = getUser();
    if (!user) {
      return router.createUrlTree([redirectTo]);
    }
    return true;
  };
}

/**
 * Factory for a guard that allows only users satisfying the isAdmin predicate.
 * Redirects to redirectTo (default: /login) when the user is absent or not admin.
 *
 * Usage in routes:
 *   { path: 'admin', canActivate: [adminGuard(() => authService.currentUser(), u => u.role === 'admin')] }
 */
export function adminGuard(
  getUser: () => User | null | undefined,
  isAdmin: (user: User) => boolean,
  redirectTo = '/login'
): CanActivateFn {
  return () => {
    const router = inject(Router);
    const user = getUser();
    if (!user || !isAdmin(user)) {
      return router.createUrlTree([redirectTo]);
    }
    return true;
  };
}
