import { z } from 'zod';

// ---------------------------------------------------------------------------
// Edit context — returned by GET /internal/profiles/edit-context
// ---------------------------------------------------------------------------

export const editContextAddressSchema = z.object({
  id: z.string().uuid(),
  countryId: z.string().uuid().nullable(),
  stateId: z.string().uuid().nullable(),
  cityId: z.string().uuid().nullable(),
  municipalityId: z.string().uuid().nullable(),
  parishId: z.string().uuid().nullable(),
  postalCodeId: z.string().uuid().nullable(),
  addressLine1: z.string(),
  formattedAddress: z.string(),
});

export type TEditContextAddress = z.infer<typeof editContextAddressSchema>;

export const editContextResponseSchema = z.object({
  role: z.enum(['owner', 'member']),
  businessAccountId: z.string().uuid(),
  ownerBusinessProfileId: z.string().uuid(),

  coreClientCode: z.string().nullable(),
  accountEmail: z.string().nullable(),
  accountFirstName: z.string().nullable(),
  accountLastName: z.string().nullable(),
  accountLegalName: z.string().nullable(),

  documentType: z.string(),
  documentNumber: z.string(),

  phonePrefixId: z.string().uuid().nullable(),
  phonePrefixValue: z.string().nullable(),
  phoneNumber: z.string().nullable(),

  billingAddress: editContextAddressSchema.nullable(),
});

export type TEditContextResponse = z.infer<typeof editContextResponseSchema>;
