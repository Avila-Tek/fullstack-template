import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const todoSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.enum(['todo', 'doing', 'done']),
  owner: z.uuid(),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type TTodo = z.infer<typeof todoSchema>;
