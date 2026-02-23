import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const userStatusSchema = z.enum(['active', 'inactive']);
export type TUserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().min(5),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  status: userStatusSchema,
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type TUser = z.output<typeof userSchema>;
export const usersSchema = z.array(userSchema);
export type TUserList = z.output<typeof usersSchema>;
