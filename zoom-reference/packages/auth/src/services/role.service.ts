import { Injectable } from '@angular/core';
import type { User } from '../domain/auth.model';

/**
 * Stub — role/permission checks are implemented in E-002
 * once the User model includes role data.
 */
@Injectable({ providedIn: 'root' })
export class RoleService {
  /** Returns true if user is considered an admin. Stub always returns false. */
  isAdmin(_user: User | null | undefined): boolean {
    return false;
  }

  /** Returns true if user has the given permission code. Stub always returns false. */
  hasPermission(_user: User | null | undefined, _code: string): boolean {
    return false;
  }
}
