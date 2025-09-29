import { TPagination } from '@repo/schemas';
import { z } from 'zod';

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface RepositoryMethods<T, WhereInput> {
  findMany(args: {
    where?: WhereInput;
    skip: number;
    take: number;
  }): Promise<T[]>;
  count(where?: WhereInput): Promise<number>;
}

export async function paginate<T, WhereInput, ParsedT>(
  repository: RepositoryMethods<T, WhereInput>,
  schema: z.ZodSchema<ParsedT[]>,
  options: PaginationOptions & { where?: WhereInput } = {}
): Promise<TPagination<ParsedT>> {
  const { page = 1, perPage = 10, where } = options;
  const skip = (page - 1) * perPage;

  const [items, count] = await Promise.all([
    repository.findMany({
      where,
      skip,
      take: perPage,
    }),
    repository.count(where),
  ]);

  const pageCount = Math.ceil(count / perPage);

  return {
    count,
    items: schema.parse(items),
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