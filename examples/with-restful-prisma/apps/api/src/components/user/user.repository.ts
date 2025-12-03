import { Prisma, PrismaClient } from '@/generated/prisma/client';

export const userOmit = {
  password: true,
  deleted: true,
  deletedAt: true,
} as const;

export type UserPublic = Prisma.UserGetPayload<{ omit: typeof userOmit }>;
export type UserPrivate = Prisma.UserGetPayload<{
  omit: { deleted: true; deletedAt: true };
}>;
export type UserWhereInput = Prisma.UserWhereInput;

export class UserRepository {
  constructor(private readonly userModel: PrismaClient['user']) {}

  async findOne(where: Prisma.UserWhereInput): Promise<UserPublic | null> {
    return this.userModel.findFirst({
      where: { ...where, deleted: false },
      omit: userOmit,
    });
  }

  async findMany(params?: {
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    skip?: number;
    take?: number;
  }): Promise<UserPublic[]> {
    const { where, ...rest } = params ?? {};
    return this.userModel.findMany({
      where: { ...where, deleted: false },
      omit: userOmit,
      ...rest,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<UserPublic> {
    return this.userModel.create({ data, omit: userOmit });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput
  ): Promise<UserPublic | null> {
    return this.userModel.update({
      where: { id, deleted: false },
      data,
      omit: userOmit,
    });
  }

  async delete(id: string): Promise<void> {
    await this.userModel.update({
      where: { id, deleted: false },
      data: { deleted: true, deletedAt: new Date() },
    });
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return this.userModel.count({ where: { ...where, deleted: false } });
  }

  async exists(where: Prisma.UserWhereInput): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  async findOneWithPassword(
    where: UserWhereInput
  ): Promise<UserPrivate | null> {
    const user = await this.userModel.findFirst({
      where: { ...where, deleted: false },
      omit: { ...userOmit, password: false },
    });
    return user;
  }
}
