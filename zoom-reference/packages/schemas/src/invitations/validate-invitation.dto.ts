import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas for command decomposition
// ---------------------------------------------------------------------------

const validateInviteeProfileSchema = z.object({
  email: z.email().max(320),
  documentType: z.string().min(1),
  documentNumber: z.string().min(1),
  phonePrefix: z.string().min(1),
});

const validateBillingAddressSchema = z.object({
  countryId: z.uuid().optional(),
  stateId: z.uuid().optional(),
  cityId: z.uuid().optional(),
  municipalityId: z.uuid().optional(),
  parishId: z.uuid().optional(),
  postalCodeId: z.uuid().optional(),
});

const validatePermissionsSchema = z.object({
  roleTemplateId: z.uuid().optional(),
});

// ---------------------------------------------------------------------------
// validateInvitationCommandSchema — internal: orchestrator → apps/api
// ---------------------------------------------------------------------------

export const validateInvitationCommandSchema = z.object({
  callerUserId: z.uuid(),
  businessAccountId: z.uuid(),
  profile: validateInviteeProfileSchema,
  billingAddress: validateBillingAddressSchema,
  permissions: validatePermissionsSchema,
});

export type TValidateInvitationCommand = z.infer<
  typeof validateInvitationCommandSchema
>;

// ---------------------------------------------------------------------------
// validateInvitationOutputSchema — internal response from apps/api
// ---------------------------------------------------------------------------

export const validateInvitationOutputSchema = z.object({
  countryId: z.uuid(),
  profile: z.object({
    normalizedEmail: z.email(),
    documentTypeId: z.uuid(),
    documentType: z.string().min(1),
    phonePrefixId: z.uuid(),
    phonePrefix: z.string().min(1),
  }),
});

export type TValidateInvitationOutput = z.infer<
  typeof validateInvitationOutputSchema
>;
