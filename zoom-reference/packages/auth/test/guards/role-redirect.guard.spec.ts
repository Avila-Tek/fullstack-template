import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../src/domain/auth.model';
import { roleRedirectGuard } from '../../src/guards/role-redirect.guard';

const user: User = {
  id: '1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: null,
  emailVerified: true,
  image: null,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('roleRedirectGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('returns true when user exists and hasRequiredRole predicate returns true', () => {
    const guard = roleRedirectGuard(
      () => user,
      () => true
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    expect(result).toBe(true);
  });

  it('redirects to /login when no user', () => {
    const guard = roleRedirectGuard(
      () => null,
      () => true
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('redirects to /login when user does not satisfy predicate', () => {
    const guard = roleRedirectGuard(
      () => user,
      () => false
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('redirects to custom path array when provided', () => {
    const guard = roleRedirectGuard(
      () => null,
      () => false,
      ['/dashboard', 'unauthorized']
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(
      router.createUrlTree(['/dashboard', 'unauthorized'])
    );
  });
});
