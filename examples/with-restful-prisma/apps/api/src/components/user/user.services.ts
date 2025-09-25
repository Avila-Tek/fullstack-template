import { TCreateUserInput, TUpdateUserInput, TUser } from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Document, FilterQuery, ProjectionType, QueryOptions } from 'mongoose';
import { TUserDocument, User } from '@/components/user/user.model';
import { PaginateModelOptions, paginateModel } from '@/utils/paginate';

declare module 'fastify' {
  interface FastifyInstance {
    userService: UserService;
  }
}

class UserService {
  constructor(private thrower: FastifyInstance['thrower']) {
    this.findMany = this.findMany.bind(this);
    this.findOne = this.findOne.bind(this);
    this.createOne = this.createOne.bind(this);
    this.updateOne = this.updateOne.bind(this);
    this.deleteOne = this.deleteOne.bind(this);
  }

  async findMany({
    page,
    perPage,
    filter,
    options,
    projection,
  }: PaginateModelOptions<typeof User>) {
    return paginateModel(
      page,
      perPage,
      User,
      filter || {},
      projection,
      options
    );
  }

  async findOne(
    filter: FilterQuery<TUser>,
    projection?: ProjectionType<TUser>,
    options?: QueryOptions<TUser>
  ): Promise<TUser | null> {
    const user = await User.findOne(filter, projection, options).exec();
    return user?.toJSON() ?? null;
  }

  async createOne(record: TCreateUserInput): Promise<TUser | null> {
    const user = await User.create(record);
    return user?.toJSON() ?? null;
  }

  async updateOne(id: string, record: TUpdateUserInput) {
    return User.findOneAndUpdate({ _id: id }, record, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteOne(id: string) {
    return this.updateOne(id, { active: false });
  }
}

export default fp(
  async (fastify) => {
    const userService = new UserService(fastify.thrower);
    fastify.decorate('userService', userService);
  },
  {
    name: 'user-service',
    dependencies: [],
  }
);
