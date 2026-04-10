import type {
  TCreateUserInput,
  TPagination,
  TPaginationInput,
  TUser,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type { PaginatedUsers, User, UserListItem } from '../domain/user';

// ---- API contract ----

export interface UserApi {
  pagination(input: TPaginationInput): Promise<Safe<TPagination<TUser>>>;
  create(input: TCreateUserInput): Promise<Safe<TUser>>;
}

// ---- transforms ----

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

export function toUserListItem(dto: TUser): UserListItem {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
  };
}

export function toPaginatedUsers(dto: TPagination<TUser>): PaginatedUsers {
  return {
    count: dto.count,
    pageInfo: dto.pageInfo,
    items: dto.items.map(toUserDomain),
  };
}

// ---- service ----

export class UserService {
  constructor(private readonly api: UserApi) {}

  async getUsers(input: TPaginationInput): Promise<PaginatedUsers> {
    const result = await this.api.pagination(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toPaginatedUsers(result.data);
  }

  async createUser(input: TCreateUserInput): Promise<User> {
    const result = await this.api.create(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toUserDomain(result.data);
  }
}
