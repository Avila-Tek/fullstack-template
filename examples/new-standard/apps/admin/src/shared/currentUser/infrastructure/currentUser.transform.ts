import type { User } from '@repo/auth';
import type { UserSession } from '../domain/currentUser.model';
import type { CurrentUserDto, SessionDto } from './currentUser.interfaces';

/**
 * Transform DTOs to domain models for admin
 */

export function toCurrentUserDomain(dto: CurrentUserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    timezone: dto.timezone,
    status: dto.status as 'Active' | 'Disabled',
    role: dto.role
      ? {
          id: dto.role.id,
          code: dto.role.code as 'USER' | 'ADMIN',
          name: dto.role.name,
          permissions: dto.role.permissions ?? [],
        }
      : null,
    createdAt: new Date(dto.createdAt ?? Date.now()),
    updatedAt: new Date(dto.updatedAt ?? Date.now()),
  };
}

export function toUserSessionDomain(dto: SessionDto): UserSession {
  return {
    user: {
      id: dto.user.id,
      email: dto.user.email,
      firstName: dto.user.firstName ?? null,
      lastName: dto.user.lastName ?? null,
      timezone: dto.user.timezone,
      status: dto.user.status,
      createdAt: new Date(dto.user.createdAt ?? Date.now()),
      updatedAt: new Date(dto.user.updatedAt ?? Date.now()),
    },
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
  };
}
