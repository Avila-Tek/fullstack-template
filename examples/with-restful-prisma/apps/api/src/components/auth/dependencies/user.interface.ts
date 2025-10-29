import { TCreateUserInput, TUser, TUserPrivate } from '@repo/schemas';
import { UserWhereInput } from '@/components/user/user.repository';

export interface IUserService {
  findOneWithPassword(where: UserWhereInput): Promise<TUserPrivate | null>;
  createOne(record: TCreateUserInput): Promise<TUser | null>;
  findOne(where: UserWhereInput): Promise<TUser | null>;
}
