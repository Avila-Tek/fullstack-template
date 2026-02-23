import { z } from 'zod';
import { SomeType } from 'zod/v4/core';

export function buildSafeResponseSchema<T extends SomeType>(schema: T) {
  const safeSchema = z.discriminatedUnion('success', [
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
    z.object({
      success: z.literal(true),
      data: schema,
    }),
  ]);
  return safeSchema;
}

export const zDateToIsoNullableOpt = z
  .union([z.date(), z.string(), z.null(), z.undefined()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v));
