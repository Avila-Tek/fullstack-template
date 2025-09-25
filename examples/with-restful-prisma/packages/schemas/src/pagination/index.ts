import { z } from 'zod';
import { SomeType } from 'zod/v4/core';

export const paginationInputSchema = z.looseObject({
  page: z
    .string()
    .default('1')
    .transform((val, ctx) => {
      try {
        const parsed = Number.parseInt(String(val));
        return parsed;
      } catch (_e) {
        ctx.issues.push({
          code: 'custom',
          message: 'Not a number',
          input: val,
        });

        // this is a special constant with type `never`
        // returning it lets you exit the transform without impacting the inferred return type
        return z.NEVER;
      }
    }),
  perPage: z
    .string()
    .default('10')
    .transform((val, ctx) => {
      try {
        const parsed = Number.parseInt(String(val));
        return parsed;
      } catch (_e) {
        ctx.issues.push({
          code: 'custom',
          message: 'Not a number',
          input: val,
        });

        // this is a special constant with type `never`
        // returning it lets you exit the transform without impacting the inferred return type
        return z.NEVER;
      }
    }),
});

export type TPaginationInput = z.infer<typeof paginationInputSchema>;

export type TPageInfo = {
  currentPage: number;
  perPage: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type TPagination<T> = {
  count: number;
  items: T[];
  pageInfo: TPageInfo;
};

export function buildPaginationSchemaForModel<T extends SomeType>(schema: T) {
  const paginationSchema = z.object({
    count: z.number(),
    pageInfo: z.object({
      currentPage: z.number(),
      perPage: z.number(),
      itemCount: z.number(),
      pageCount: z.number(),
      hasPreviousPage: z.boolean(),
      hasNextPage: z.boolean(),
    }),
    items: z.array(schema),
  });
  return paginationSchema;
}
