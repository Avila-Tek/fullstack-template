import { TCreateUserInput, TUser } from '@repo/schemas';
import { FilterQuery, ProjectionType, QueryOptions } from 'mongoose';

export interface IUserService {
  findOne(
    filter: FilterQuery<TUser>,
    projection?: ProjectionType<TUser>,
    options?: QueryOptions<TUser>
  ): Promise<TUser | null>;
  createOne(record: TCreateUserInput): Promise<TUser | null>;
}
