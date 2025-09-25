import { Prisma, PrismaClient } from '@prisma/client';
import { TCreateUserInput, TUpdateUserInput } from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { GenericPrismaRepository } from '../../lib/orm/generic-repository';

declare module 'fastify' {
  interface FastifyInstance {
    userRepository: UserRepository;
  }
}

export type UserWhereInput = Prisma.UserWhereInput;
export type UserSelect = Prisma.UserSelect;
export type UserOrderBy = Prisma.UserOrderByWithRelationInput;
export type UserInclude = Prisma.UserInclude;

export class UserRepository extends GenericPrismaRepository<
  Prisma.UserDelegate,
  UserWhereInput,
  Prisma.UserWhereUniqueInput,
  UserSelect,
  UserInclude,
  UserOrderBy,
  TCreateUserInput,
  TUpdateUserInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.user);
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const userRepository = new UserRepository(fastify.prisma);
    fastify.decorate('userRepository', userRepository);
  },
  {
    name: 'user-repository',
    dependencies: ['prisma'],
  }
);
