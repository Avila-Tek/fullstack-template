import { z } from 'zod';

export const todoSchema = z.object({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  title: z.string().min(1),
  description: z.string().default(''),
  status: z.enum(['todo', 'doing', 'done']),
  active: z.boolean().default(true),
  owner: z.string().regex(/^[0-9a-fA-F]{24}$/),
  createdAt: z.iso.datetime().nullable().optional(),
  updatedAt: z.iso.datetime().nullable().optional(),
});

export type TTodo = z.infer<typeof todoSchema>;
