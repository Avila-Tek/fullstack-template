import { TUser } from '@repo/schemas';
import { User } from '@prisma/client';

export class UserMapper {
  static toService(user: User): TUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      active: user.active,
      createdAt: user.createdAt?.toISOString() ?? null,
      updatedAt: user.updatedAt?.toISOString() ?? null,
    };
  }

  static toServiceArray(users: User[]): TUser[] {
    return users.map(user => UserMapper.toService(user));
  }

  static toServiceNullable(user: User | null): TUser | null {
    return user ? UserMapper.toService(user) : null;
  }
}