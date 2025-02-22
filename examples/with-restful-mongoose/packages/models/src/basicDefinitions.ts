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
