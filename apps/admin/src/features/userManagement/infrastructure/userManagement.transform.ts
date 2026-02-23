import type { TPagination, TUser } from '@repo/schemas';
import type { PaginatedUsers, User, UserListItem } from '../domain/user.model';

/**
 * Transforms a User DTO from the API to the domain model
 */
export function toUserDomain(dto: TUser): User {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    timezone: dto.timezone,
    status: dto.status,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
  };
}

/**
 * Transforms a User DTO to a list item (lighter weight)
 */
export function toUserListItem(dto: TUser): UserListItem {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
  };
}

/**
 * Transforms a paginated User DTO response to domain model
 */
export function toPaginatedUsers(dto: TPagination<TUser>): PaginatedUsers {
  return {
    count: dto.count,
    pageInfo: dto.pageInfo,
    items: dto.items.map(toUserDomain),
  };
}
