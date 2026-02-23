import type { Role, Session, User } from '@repo/auth';
import type { TRole } from '@repo/schemas';
import type { AuthSessionDto, AuthUserDto } from './auth.interfaces';

export function toRoleDomain(dto: TRole | null | undefined): Role | null {
  if (!dto) return null;
  return {
    id: dto.id,
    code: dto.code as 'USER' | 'ADMIN',
    name: dto.name,
    permissions: dto.permissions ?? [],
  };
}

export function toUserDomain(dto: AuthUserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    timezone: dto.timezone,
    status: dto.status as 'active' | 'inactive',
    role: toRoleDomain(dto.role),
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  };
}

export function toSessionDomain(dto: AuthSessionDto): Session {
  return {
    user: toUserDomain(dto.user),
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
  };
}
