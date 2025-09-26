import { z } from 'zod';

const zDateToIsoNullableOpt = z
  .union([z.date(), z.null(), z.undefined()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v));

export const userSchema = z.object({
  id: z.uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.email().min(5),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type TUser = z.output<typeof userSchema>;
export const usersSchema = z.array(userSchema);
export type TUserList = z.output<typeof usersSchema>;
