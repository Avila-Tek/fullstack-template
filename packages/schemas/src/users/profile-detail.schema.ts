import { z } from 'zod';

export const profilePersonalSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  legalName: z.string().nullable(),
  email: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  phonePrefixId: z.string().uuid().nullable(),
  documentTypeId: z.string().uuid(),
  documentNumber: z.string(),
});

export type TProfilePersonal = z.infer<typeof profilePersonalSchema>;

export const profileAddressSchema = z.object({
  billingAddressLine1: z.string().nullable(),
  billingAddressCountryId: z.string().uuid().nullable(),
  billingAddressStateId: z.string().uuid().nullable(),
  billingAddressCityId: z.string().uuid().nullable(),
});

export type TProfileAddress = z.infer<typeof profileAddressSchema>;

export const profileDetailResponseSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('owner'),
    profile: profilePersonalSchema,
    address: profileAddressSchema,
  }),
  z.object({
    role: z.literal('member'),
    profile: profilePersonalSchema,
    address: profileAddressSchema,
  }),
]);

export type TProfileDetailResponse = z.infer<
  typeof profileDetailResponseSchema
>;
