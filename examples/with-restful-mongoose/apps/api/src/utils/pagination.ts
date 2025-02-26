import type {
  Document,
  Model,
  Types,
  FilterQuery,
  QueryOptions,
  ProjectionType,
  PipelineStage,
  AggregateOptions,
} from 'mongoose';

export type Pagination<T> = {
  count: number;
  items: T[];
  pageInfo: {
    currentPage: number;
    perPage: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
};

/**
 * @async
 * @description This function recieves a model and executes all the logic for pagination
 * @param {number} page - actual page
 * @param {number} perPage - items per page
 * @param {T} model - mongoose model
 * @param {FilterQuery<T>} filter - filter query
 * @param {ProjectionType<T> | null} projection - projection
 * @param {QueryOptions<T> | null} options - options
 * @returns {Promise<Pagination<U>>} - pagination object
 * @since 1.0.0
 * @summary Paginates a model
 * @version 1
 */
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
    throw new Error('404-pageOutOfRange');
  }
  const skip = Math.max(0, (page - 1) * perPage);
  const items = await model.find<U>(filter, projection, {
    ...(options ?? {}),
    skip,
    limit: perPage,
  });
  return {
    count,
    items,
    pageInfo: {
      currentPage: page,
      perPage,
      pageCount,
      itemCount: count,
      hasPreviousPage: page > 1,
      hasNextPage: items.length > perPage || page * perPage < count,
    },
  };
}

/**
 * @async
 * @description This function recieves a model and executes all the logic for pagination
 * @param {PipelineStage[]} pipeline - The pipeline to be used in the aggregation
 * @param {number} page - actual page
 * @param {number} perPage - items per page
 * @param {T} model - mongoose model
 * @param {AggregateOptions} options - options
 * @returns {Promise<Pagination<U>>} - pagination object
 * @since 1.0.0
 * @summary Paginates a pipeline
 * @version 1
 */
export async function complexPagination<
  T extends Model<Document<Types.ObjectId, object>>,
  U extends Document,
>(
  pipeline: PipelineStage[],
  page: number,
  perPage: number,
  model: T,
  options: AggregateOptions = {}
): Promise<Pagination<U>> {
  const from = (Number(page ?? 1) - 1) * Number(perPage ?? 10);
  const [response] = await model.aggregate<{ count: number; items: U[] }>(
    [
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
    ],
    options
  );

  const count = response?.count ?? 0;
  const items = response?.items ?? [];

  const pageCount = Math.ceil(count / (perPage ?? 10));

  return {
    count,
    items,
    pageInfo: {
      currentPage: Number(page),
      perPage: Number(perPage),
      pageCount,
      itemCount: count,
      hasPreviousPage: Number(page) > 1,
      hasNextPage: pageCount > page,
    },
  };
}
