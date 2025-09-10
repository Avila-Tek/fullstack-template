import type {
  TPagination as Pagination,
  TPaginationInput,
} from '@repo/schemas';

export type { Pagination, TPaginationInput };

import type {
  Document,
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  QueryOptions,
} from 'mongoose';

export type PaginateModelOptions<T extends Model<any>> = {
  page: number;
  perPage: number;
  filter?: FilterQuery<T> | null;
  projection?: ProjectionType<T> | null;
  options?: QueryOptions<T> | null;
};

export async function paginateModel<T extends Model<any>, U extends Document>(
  page: number,
  perPage: number,
  model: T,
  filter: FilterQuery<T> = {},
  projection: ProjectionType<T> | null = null,
  options: QueryOptions<T> | null = {}
): Promise<Pagination<U>> {
  const count = await model.countDocuments(filter);
  const pageCount = Math.ceil(count / perPage);
  if (page > pageCount) {
    throw new Error('No hay más páginas disponibles');
  }
  const skip = Math.max(0, (page - 1) * perPage);
  const products = await model.find(filter, projection, {
    ...(options ?? {}),
    skip,
    limit: perPage,
  });
  return {
    count,
    items: products,
    pageInfo: {
      currentPage: page,
      perPage,
      pageCount,
      itemCount: count,
      hasPreviousPage: page > 1,
      hasNextPage: products.length > perPage || page * perPage < count,
    },
  };
}

export async function paginatePipeline<U>(
  pipeline: PipelineStage[],
  model: any,
  page: number = 1,
  perPage: number = 10,
  collation?: { locale: string; strength: number }
): Promise<Pagination<U>> {
  const from = (page - 1) * perPage;
  const [response] = (await model
    .aggregate([
      ...pipeline,
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          items: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          count: 1,
          items: {
            $slice: ['$items', Number(from), Number(perPage)],
          },
        },
      },
    ])
    .collation(collation)) as unknown as {
    count: number;
    items: any[];
  }[];

  const count = response?.count ?? 0;
  const items = response?.items ?? [];
  const pageCount = Math.ceil(count / (perPage ?? 1));

  return {
    count,
    items,
    pageInfo: {
      currentPage: page,
      perPage,
      pageCount,
      itemCount: count,
      hasPreviousPage: page > 1,
      hasNextPage: pageCount > page,
    },
  };
}
