import type { Role, Session, User } from '@repo/auth';
import type { TRole, TSignInInput, TUser } from '@repo/schemas';

// ---- DTOs & API contract ----

export type AuthUserDto = TUser;

export interface AuthSessionDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse<T> = { success: true; data: T } | AuthErrorResponse;

export interface AuthApi {
  signIn(input: TSignInInput): Promise<AuthResponse<AuthSessionDto>>;
  signOut(): Promise<AuthResponse<void>>;
}

// ---- transforms ----

export function toRoleDomain(dto: TRole | null | undefined): Role | null {
  if (!dto) return null;
  return {
    id: dto.id,
    code: dto.code,
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
    timezone: dto.timezone ?? '',
    status: dto.status,
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

// ---- service ----

export class AuthServiceClass {
  constructor(private readonly api: AuthApi) {}

  async signIn(input: TSignInInput): Promise<Session> {
    const result = await this.api.signIn(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toSessionDomain(result.data);
  }

  async signOut(): Promise<void> {
    const result = await this.api.signOut();
    if (!result.success) {
      throw new Error(result.error);
    }
  }
}
