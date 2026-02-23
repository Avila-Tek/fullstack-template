import { z } from 'zod';
import { buildSafeResponseSchema } from '../utils';
import { userSchema, usersSchema } from './user.schema';

// User ID Params (for route params)
export const userIdParamsSchema = z.object({
  id: z.uuid(),
});
export type TUserIdParams = z.infer<typeof userIdParamsSchema>;

// Alias for response (userSchema already has the correct structure)
export type TUserResponse = z.output<typeof userSchema>;

// Safe wrapped responses
export const userResponseSchema = buildSafeResponseSchema(userSchema);
export type TSafeUserResponse = z.output<typeof userResponseSchema>;

export const usersResponseSchema = buildSafeResponseSchema(usersSchema);
export type TSafeUsersResponse = z.output<typeof usersResponseSchema>;

export const createUserInput = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type TCreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export type TUpdateUserInput = z.infer<typeof updateUserInput>;

export const assignRoleInput = z.object({
  roleCode: z.enum(['user', 'admin']),
});

export type TAssignRoleInput = z.infer<typeof assignRoleInput>;
