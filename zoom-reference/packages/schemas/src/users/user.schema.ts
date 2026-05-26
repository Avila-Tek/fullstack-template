import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  twoFactorEnabled: z.boolean(),
  isSocialOnly: z.boolean().default(false),
  timezone: z.string().optional(),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type TUser = z.output<typeof userSchema>;
export const usersSchema = z.array(userSchema);
export type TUserList = z.output<typeof usersSchema>;
