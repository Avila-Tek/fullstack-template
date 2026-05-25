import { z } from 'zod';

// ---------------------------------------------------------------------------
// collaboratorEditContextSchema
// GET /internal/profiles/collaborator-edit-context — response schema
// ---------------------------------------------------------------------------

export const collaboratorEditContextSchema = z.object({
  businessAccountId: z.uuid(),
  documentType: z.string(),
  documentNumber: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  legalName: z.string().nullable(),
  accountEmail: z.email().nullable(),
  phonePrefixValue: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  billingAddress: z
    .object({
      addressLine1: z.string(),
      formattedAddress: z.string().nullable(),
      countryId: z.uuid().nullable(),
      stateId: z.uuid().nullable(),
      cityId: z.uuid().nullable(),
      municipalityId: z.uuid().nullable(),
      parishId: z.uuid().nullable(),
      postalCodeId: z.uuid().nullable(),
    })
    .nullable(),
});

export type TCollaboratorEditContext = z.infer<
  typeof collaboratorEditContextSchema
>;
