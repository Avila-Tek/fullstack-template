import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const userStatusSchema = z.enum(['Active', 'Disabled']);
export type TUserStatus = z.infer<typeof userStatusSchema>;

export const roleSchema = z.object({
  id: z.uuid(),
  code: z.enum(['USER', 'ADMIN']),
  name: z.string(),
  permissions: z.array(z.string()),
});

export type TRole = z.output<typeof roleSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().min(5),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  timezone: z.string(),
  status: userStatusSchema,
  role: roleSchema.nullable().optional(),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type TUser = z.output<typeof userSchema>;
export const usersSchema = z.array(userSchema);
export type TUserList = z.output<typeof usersSchema>;
