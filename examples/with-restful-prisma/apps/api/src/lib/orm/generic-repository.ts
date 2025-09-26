import { Prisma } from '@prisma/client';

type DelegateLike = {
  findMany: (...a: any[]) => any;
  findFirst: (...a: any[]) => any;
  findUnique: (...a: any[]) => any;
  create: (...a: any[]) => any;
  update: (...a: any[]) => any;
  delete: (...a: any[]) => any;
  count: (...a: any[]) => any;
};

export abstract class GenericPrismaRepository<D extends DelegateLike> {
  constructor(protected readonly model: D) {}

  findMany<T extends Prisma.Args<D, 'findMany'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'findMany'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'findMany'>> {
    return this.model.findMany(args);
  }

  findFirst<T extends Prisma.Args<D, 'findFirst'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'findFirst'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'findFirst'> | null> {
    return this.model.findFirst(args);
  }

  findUnique<T extends Prisma.Args<D, 'findUnique'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'findUnique'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'findUnique'> | null> {
    return this.model.findUnique(args);
  }

  create<T extends Prisma.Args<D, 'create'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'create'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'create'>> {
    return this.model.create(args);
  }

  update<T extends Prisma.Args<D, 'update'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'update'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'update'>> {
    return this.model.update(args);
  }

  delete<T extends Prisma.Args<D, 'delete'>>(
    args: Prisma.SelectSubset<T, Prisma.Args<D, 'delete'>>
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'delete'>> {
    return this.model.delete(args);
  }

  count<T extends Prisma.Args<D, 'count'>>(
    args: T
  ): Prisma.PrismaPromise<Prisma.Result<D, T, 'count'>> {
    return this.model.count(args);
  }
}
