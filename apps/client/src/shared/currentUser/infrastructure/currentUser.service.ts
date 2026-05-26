import { authClient } from '@repo/auth';
import type { User } from '@repo/auth';
import { betterAuthUserSchema } from '@repo/schemas';
import type { CurrentUser } from '../domain/currentUser.model';

/**
 * CurrentUserServiceClass fetches the authenticated user from Better Auth.
 * The BA session endpoint returns both session and user — we parse through
 * Zod to catch API contract drift early.
 */
export class CurrentUserServiceClass {
  async getCurrentUser(): Promise<CurrentUser> {
    const result = await authClient.getSession();
    if (!result.data?.user) {
      throw new Error('Not authenticated');
    }
    const dto = betterAuthUserSchema.parse(result.data.user);
    const user: User = {
      id:            dto.id,
      email:         dto.email,
      name:          dto.name,
      emailVerified: dto.emailVerified,
      image:         dto.image ?? null,
      createdAt:     dto.createdAt,
      updatedAt:     dto.updatedAt,
      firstName:     dto.firstName ?? null,
      lastName:      dto.lastName ?? null,
      timezone:      dto.timezone,
      status:        dto.status,
    };
    return user;
  }
}
