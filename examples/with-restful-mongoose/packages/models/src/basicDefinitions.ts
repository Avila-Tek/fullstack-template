import { z } from 'zod';
import { Types } from 'mongoose';

export const basicDefinition = z.object({
  _id: z.instanceof(Types.ObjectId).optional(),
  createdAt: z.string().datetime().or(z.date()).nullable().optional(),
  updatedAt: z.string().datetime().or(z.date()).nullable().optional(),
});

export const basicModelDefinition = basicDefinition.extend({
  active: z.boolean().optional(),
});

export const paginateParams = z.object({
  page: z.number(),
  perPage: z.number(),
});
export type TPaginateParams = z.infer<typeof paginateParams>;

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
