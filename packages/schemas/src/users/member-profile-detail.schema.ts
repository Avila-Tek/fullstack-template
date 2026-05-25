import { z } from 'zod';
import {
  profileAddressSchema,
  profilePersonalSchema,
} from './profile-detail.schema';

export const memberProfilePersonalSchema = profilePersonalSchema.extend({
  phonePrefix: z.string().nullable(),
  documentType: z.string(),
});

export type TMemberProfilePersonal = z.infer<
  typeof memberProfilePersonalSchema
>;

export const memberProfileAddressSchema = profileAddressSchema.extend({
  countryText: z.string().nullable(),
  stateText: z.string().nullable(),
  cityText: z.string().nullable(),
});

export type TMemberProfileAddress = z.infer<typeof memberProfileAddressSchema>;

export const memberProfileDetailSchema = z.object({
  profile: memberProfilePersonalSchema,
  address: memberProfileAddressSchema,
  role: z.enum(['owner', 'member']),
  status: z.enum(['active', 'invited', 'suspended']),
  roleTemplateName: z.string().nullable(),
});

export type TMemberProfileDetail = z.infer<typeof memberProfileDetailSchema>;
