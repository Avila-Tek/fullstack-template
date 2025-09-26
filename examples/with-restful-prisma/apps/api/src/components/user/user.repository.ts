import { Prisma, PrismaClient } from '@prisma/client';
import { GenericPrismaRepository } from '../../lib/orm/generic-repository';

export type UserWhereInput = Prisma.UserWhereInput;
export type UserSelect = Prisma.UserSelect;
export type UserOrderBy = Prisma.UserOrderByWithRelationInput;
export type UserInclude = Prisma.UserInclude;

export class UserRepository extends GenericPrismaRepository<
  PrismaClient['user']
> {
  constructor(prisma: PrismaClient) {
    super(prisma.user);
  }
}
