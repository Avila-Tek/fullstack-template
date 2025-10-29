import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const userSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email().min(5),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export const userPrivateSchema = userSchema.extend({
  password: z.string().min(6).max(255),
});

export type TUser = z.output<typeof userSchema>;
export type TUserPrivate = z.output<typeof userPrivateSchema>;
export const usersSchema = z.array(userSchema);
export type TUserList = z.output<typeof usersSchema>;
