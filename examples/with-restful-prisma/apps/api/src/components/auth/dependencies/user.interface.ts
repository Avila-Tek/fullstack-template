import { TCreateUserInput, TUser } from '@repo/schemas';
import {
  UserInclude,
  UserSelect,
  UserWhereInput,
} from '@/components/user/user.repository';

export interface IUserService {
  findOne(
    where: UserWhereInput,
    select?: UserSelect,
    include?: UserInclude
  ): Promise<TUser | null>;
  createOne(record: TCreateUserInput): Promise<TUser | null>;
}
