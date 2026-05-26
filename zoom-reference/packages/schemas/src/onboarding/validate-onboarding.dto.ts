import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas for command decomposition
// ---------------------------------------------------------------------------

const validateOnboardeeProfileSchema = z.object({
  documentType: z.string().min(1),
  documentNumber: z.string().min(1),
  phonePrefix: z.string().min(1),
});

const validateOnboardingBillingAddressSchema = z.object({
  countryId: z.uuid().optional(),
  stateId: z.uuid().optional(),
  cityId: z.uuid().optional(),
  municipalityId: z.uuid().optional(),
  parishId: z.uuid().optional(),
  postalCodeId: z.uuid().optional(),
});

// ---------------------------------------------------------------------------
// validateOnboardingInputSchema — internal: orchestrator → apps/api
// ---------------------------------------------------------------------------

export const validateOnboardingInputSchema = z.object({
  userId: z.uuid(),
  profile: validateOnboardeeProfileSchema,
  billingAddress: validateOnboardingBillingAddressSchema,
});

export type TValidateOnboardingInput = z.infer<
  typeof validateOnboardingInputSchema
>;

// ---------------------------------------------------------------------------
// validateOnboardingOutputSchema — internal response from apps/api
// ---------------------------------------------------------------------------

export const validateOnboardingOutputSchema = z.object({
  countryId: z.uuid(),
  profile: z.object({
    documentTypeId: z.uuid(),
    phonePrefixId: z.uuid(),
    documentType: z.string().min(1),
    phonePrefix: z.string().min(1),
  }),
});

export type TValidateOnboardingOutput = z.infer<
  typeof validateOnboardingOutputSchema
>;
