import type { TCreateUserInput, TPaginationInput } from '@repo/schemas';
import type { PaginatedUsers, User } from '../domain/user.model';
import type { UserApi } from './userManagement.interfaces';
import { toPaginatedUsers, toUserDomain } from './userManagement.transform';

export class UserService {
  constructor(private api: UserApi) {}

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
