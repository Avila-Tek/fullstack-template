import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../../src/domain/auth.model';
import { RoleService } from '../../src/services/role.service';

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

describe('RoleService', () => {
  let service: RoleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleService);
  });

  describe('isAdmin', () => {
    it('returns false for a valid user (stub)', () => {
      expect(service.isAdmin(user)).toBe(false);
    });

    it('returns false for null', () => {
      expect(service.isAdmin(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(service.isAdmin(undefined)).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('returns false for a valid user and any permission code (stub)', () => {
      expect(service.hasPermission(user, 'some:permission')).toBe(false);
    });

    it('returns false for null user', () => {
      expect(service.hasPermission(null, 'some:permission')).toBe(false);
    });
  });
});
