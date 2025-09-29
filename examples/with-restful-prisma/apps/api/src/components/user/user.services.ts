import {
  TCreateUserInput,
  TPagination,
  TUpdateUserInput,
  TUser,
  TUserPrivate,
  userPrivateSchema,
  userSchema,
  usersSchema,
} from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { paginate } from '../../utils/pagination';
import { UserRepository, UserWhereInput } from './user.repository';

declare module 'fastify' {
  interface FastifyInstance {
    userService: UserService;
  }
}

class UserService {
  constructor(
    private readonly thrower: FastifyInstance['thrower'],
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
  }: {
    page?: number;
    perPage?: number;
    where?: UserWhereInput;
  } = {}): Promise<TPagination<TUser>> {
    return paginate(this.userRepository, usersSchema, { page, perPage, where });
  }

  async findOne(where: UserWhereInput): Promise<TUser | null> {
    const user = await this.userRepository.findOne(where);
    return user ? userSchema.parse(user) : null;
  }

  async createOne(record: TCreateUserInput): Promise<TUser | null> {
    const user = await this.userRepository.create(record);
    return userSchema.parse(user);
  }

  async updateOne(id: string, record: TUpdateUserInput): Promise<TUser | null> {
    const user = await this.userRepository.update(id, record);
    return userSchema.parse(user);
  }

  async deleteOne(id: string): Promise<void> {
    return this.userRepository.delete(id);
  }

  async findOneWithPassword(
    where: UserWhereInput
  ): Promise<TUserPrivate | null> {
    const user = await this.userRepository.findOneWithPassword(where);
    if (!user) this.thrower.silentException('user', 'not-found');
    return userPrivateSchema.parse(user);
  }
}

export default fp(
  async (fastify) => {
    const userRepository = new UserRepository(fastify.prisma.user);
    const userService = new UserService(fastify.thrower, userRepository);
    fastify.decorate('userService', userService);
  },
  {
    name: 'user-service',
  }
);
