import {
  betterAuthUserSchema,
  getSessionResponseSchema,
  type TBetterAuthUser,
  type TGetSessionResponse,
} from '@repo/schemas';
import type { Session, User } from '../domain/auth.model';

/**
 * Parse the raw Better Auth user payload through Zod and return a domain User.
 * Throws a ZodError if the shape doesn't match (detects API contract drift early).
 */
export function toUserDomain(raw: unknown): User {
  const dto: TBetterAuthUser = betterAuthUserSchema.parse(raw);
  return {
    id:            dto.id,
    email:         dto.email,
    name:          dto.name,
    emailVerified: dto.emailVerified,
    image:         dto.image ?? null,
    createdAt:     dto.createdAt,
    updatedAt:     dto.updatedAt,
    // Extended fields — present only when the server sends them
    firstName:  dto.firstName ?? null,
    lastName:   dto.lastName ?? null,
    timezone:   dto.timezone,
    status:     dto.status,
  };
}

/**
 * Parse the raw Better Auth getSession response through Zod and return a domain Session.
 */
export function toSessionDomain(raw: unknown): Session {
  const dto: TGetSessionResponse = getSessionResponseSchema.parse(raw);
  return {
    sessionId: dto.session.id,
    expiresAt: dto.session.expiresAt,
    user:      toUserDomain(dto.user),
  };
}
