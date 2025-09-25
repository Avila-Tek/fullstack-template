import { z } from 'zod';
import { userSchema } from './user.schema';

export const createUserInput = userSchema
  .omit({ id: true, active: true, createdAt: true, updatedAt: true })
  .required();

export type TCreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = userSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial();

export type TUpdateUserInput = z.infer<typeof updateUserInput>;
