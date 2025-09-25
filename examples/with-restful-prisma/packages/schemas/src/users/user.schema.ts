import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email().min(5),
  password: z.string().min(8).optional(),
  active: z.boolean().default(true),
  createdAt: z.iso.datetime().nullable().optional(),
  updatedAt: z.iso.datetime().nullable().optional(),
});

export type TUser = z.infer<typeof userSchema>;
