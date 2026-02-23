import type {
  TCreateUserInput,
  TPagination,
  TPaginationInput,
  TUser,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';

/**
 * Contract for User API operations.
 * Implementations live in packages/services, injected via DI.
 */
export interface UserApi {
  pagination(input: TPaginationInput): Promise<Safe<TPagination<TUser>>>;
  create(input: TCreateUserInput): Promise<Safe<TUser>>;
}
