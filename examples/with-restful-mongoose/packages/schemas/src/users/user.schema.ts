import { z } from 'zod';

export const userSchema = z.object({
  _id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email().min(5),
  password: z.string().min(8).optional(),
  active: z.boolean().default(true),
  createdAt: z.iso.datetime().nullable().optional(),
  updatedAt: z.iso.datetime().nullable().optional(),
});

export type TUser = z.infer<typeof userSchema>;
