import { z } from 'zod';
import { userSchema } from './user.schema';

export const createUserInput = userSchema.required();

export type TCreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = userSchema.partial().extend({
  _id: z.string(),
});

export type TUpdateUserInput = z.infer<typeof updateUserInput>;
