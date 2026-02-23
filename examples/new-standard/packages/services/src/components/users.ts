import {
  buildPaginationSchemaForModel,
  buildSafeResponseSchema,
  TPagination as Pagination,
  TCreateUserInput,
  TPaginationInput,
  TUser,
  userSchema,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type { HttpClient, HttpRequestOptions } from '../http';

// Build the paginated users response schema once (it's reused)
const paginatedUsersResponseSchema = buildSafeResponseSchema(
  buildPaginationSchemaForModel(userSchema)
);

/**
 * UserService - User management operations
 *
 * Uses HttpClient with optional schema for automatic validation and envelope unwrapping.
 */
export class UserService {
  private readonly basePath = '/v1/users';
  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Create a new user
   * Note: This endpoint returns a plain user object, not an envelope.
   */
  async create(
    input: TCreateUserInput,
    options?: HttpRequestOptions
  ): Promise<Safe<TUser>> {
    return await this.httpClient.post(
      `${this.basePath}/create`,
      input,
      undefined,
      options
    );
  }

  /**
   * Get paginated list of users
   */
  async pagination(
    input: TPaginationInput,
    options?: HttpRequestOptions
  ): Promise<Safe<Pagination<TUser>>> {
    return await this.httpClient.get(
      `${this.basePath}`,
      { page: input.page, perPage: input.perPage },
      {
        ...options,
      },
      paginatedUsersResponseSchema
    );
  }
}
