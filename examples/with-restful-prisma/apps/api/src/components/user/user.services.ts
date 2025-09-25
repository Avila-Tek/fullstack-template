import {
  TCreateUserInput,
  TPagination,
  TUpdateUserInput,
  TUser,
} from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { UserMapper } from './user.mapper';
import { UserOrderBy, UserRepository, UserWhereInput } from './user.repository';

declare module 'fastify' {
  interface FastifyInstance {
    userService: UserService;
  }
}

class UserService {
  constructor(
    private thrower: FastifyInstance['thrower'],
    private readonly userRepository: UserRepository
  ) {
    this.findMany = this.findMany.bind(this);
    this.findOne = this.findOne.bind(this);
    this.createOne = this.createOne.bind(this);
    this.updateOne = this.updateOne.bind(this);
    this.deleteOne = this.deleteOne.bind(this);
  }

  async findMany({
    page = 1,
    perPage = 10,
    where,
    orderBy,
  }: {
    page?: number;
    perPage?: number;
    where?: UserWhereInput;
    orderBy?: UserOrderBy;
  } = {}): Promise<TPagination<TUser>> {
    const skip = (page - 1) * perPage;

    const [users, count] = await Promise.all([
      this.userRepository.findMany({
        where: { active: true, ...where },
        orderBy,
        skip,
        take: perPage,
      }),
      this.userRepository.count({
        where: { active: true, ...where },
      }),
    ]);

    const pageCount = Math.ceil(count / perPage);

    return {
      count,
      items: UserMapper.toServiceArray(users),
      pageInfo: {
        currentPage: page,
        perPage,
        pageCount,
        itemCount: count,
        hasPreviousPage: page > 1,
        hasNextPage: page < pageCount,
      },
    };
  }

  async findOne(where: UserWhereInput): Promise<TUser | null> {
    const user = await this.userRepository.findFirst({
      where: { active: true, ...where },
    });
    return UserMapper.toServiceNullable(user);
  }

  async createOne(record: TCreateUserInput): Promise<TUser | null> {
    const user = await this.userRepository.create({
      data: record,
    });
    return UserMapper.toServiceNullable(user);
  }

  async updateOne(id: string, record: TUpdateUserInput): Promise<TUser | null> {
    const user = await this.userRepository.update({
      where: { id },
      data: record,
    });
    return UserMapper.toServiceNullable(user);
  }

  async deleteOne(id: string): Promise<TUser | null> {
    return this.updateOne(id, { active: false });
  }
}

export default fp(
  async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma);
    const userService = new UserService(fastify.thrower, userRepository);
    fastify.decorate('userService', userService);
  },
  {
    name: 'user-service',
    dependencies: ['user-repository'],
  }
);
