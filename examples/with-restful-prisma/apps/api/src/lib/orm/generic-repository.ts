import { Prisma, PrismaClient } from '@prisma/client';

export abstract class GenericPrismaRepository<
  TModel extends Record<string, any>,
  TWhereInput,
  TWhereUniqueInput,
  TSelect,
  TInclude,
  TOrderBy,
  TCreateInput,
  TUpdateInput,
> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: TModel
  ) {}

  async findMany<
    W extends TWhereInput,
    S extends TSelect,
    I extends TInclude,
    O extends TOrderBy,
  >(params: {
    where?: TWhereInput;
    select?: TSelect;
    include?: TInclude;
    orderBy?: TOrderBy;
    skip?: number;
    take?: number;
  }): Promise<
    Prisma.Result<
      TModel,
      {
        select: S;
        include: I;
        where: W;
        orderBy: O;
      },
      'findMany'
    >
  > {
    return this.model.findMany(params);
  }

  async findFirst<
    W extends TWhereInput,
    S extends TSelect,
    I extends TInclude,
  >(params: {
    where: TWhereInput;
    select?: TSelect;
    include?: TInclude;
  }): Promise<Prisma.Result<
    TModel,
    {
      select: S;
      include: I;
      where: W;
    },
    'findFirst'
  > | null> {
    return this.model.findFirst(params);
  }

  async findUnique<
    W extends TWhereInput,
    S extends TSelect,
    I extends TInclude,
  >(params: {
    where: TWhereUniqueInput;
    select?: TSelect;
    include?: TInclude;
  }): Promise<Prisma.Result<
    TModel,
    {
      select: S;
      include: I;
      where: W;
    },
    'findUnique'
  > | null> {
    return this.model.findUnique(params);
  }

  async create<S extends TSelect, I extends TInclude>(params: {
    data: TCreateInput;
    select?: TSelect;
    include?: TInclude;
  }): Promise<
    Prisma.Result<
      TModel,
      {
        select: S;
        include: I;
      },
      'create'
    >
  > {
    return this.model.create(params);
  }

  async update<
    W extends TWhereUniqueInput,
    S extends TSelect,
    I extends TInclude,
  >(params: {
    where: TWhereUniqueInput;
    data: TUpdateInput;
    select?: TSelect;
    include?: TInclude;
  }): Promise<
    Prisma.Result<
      TModel,
      {
        select: S;
        include: I;
        where: W;
      },
      'update'
    >
  > {
    return this.model.update(params);
  }

  async delete<W extends TWhereUniqueInput>(params: {
    where: TWhereUniqueInput;
  }): Promise<
    Prisma.Result<
      TModel,
      {
        where: W;
      },
      'delete'
    >
  > {
    return this.model.delete(params);
  }

  async count(params?: { where?: TWhereInput }): Promise<number> {
    return this.model.count(params);
  }
}
