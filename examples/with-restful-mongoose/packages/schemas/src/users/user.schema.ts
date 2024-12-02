import { z } from 'zod';

export const userSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().min(5),
  password: z.string().min(8).optional(),
});

export type TUser = z.infer<typeof userSchema>;
