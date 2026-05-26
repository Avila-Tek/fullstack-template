import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../src/domain/auth.model';
import { adminGuard, authGuard } from '../../src/guards/auth.guard';

const user: User = {
  id: '1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: null,
  emailVerified: true,
  image: null,
  twoFactorEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('adminGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('returns true when user exists and isAdmin predicate returns true', () => {
    const guard = adminGuard(
      () => user,
      () => true
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    expect(result).toBe(true);
  });

  it('redirects to /login when no user', () => {
    const guard = adminGuard(
      () => null,
      () => false
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('redirects to /login when user is not admin', () => {
    const guard = adminGuard(
      () => user,
      () => false
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });

  it('redirects to custom path when provided', () => {
    const guard = adminGuard(
      () => null,
      () => false,
      '/unauthorized'
    );
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/unauthorized']));
  });
});

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('returns true when user exists', () => {
    const guard = authGuard(() => user);
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    expect(result).toBe(true);
  });

  it('redirects to /login when no user', () => {
    const guard = authGuard(() => null);
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never)
    );
    const router = TestBed.inject(Router);
    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
