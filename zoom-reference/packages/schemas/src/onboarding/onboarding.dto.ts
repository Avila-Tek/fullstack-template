import { z } from 'zod';
import { billingAddressInputSchema } from '../shared/billing-address.schema';
import {
  documentInputSchema,
  phoneInputSchema,
  profileNamesSchema,
  refineProfileNames,
} from '../shared/profile-identity.schema';

// ---------------------------------------------------------------------------
// onboardingProfileInputSchema — profile identity, document, and phone
// ---------------------------------------------------------------------------

const onboardingProfileInputSchema = z
  .object({
    ...profileNamesSchema.shape,
    ...documentInputSchema.shape,
    ...phoneInputSchema.shape,
  })
  .superRefine(refineProfileNames);

// ---------------------------------------------------------------------------
// onboardingInputSchema
// ---------------------------------------------------------------------------

export const onboardingInputSchema = z.object({
  profile: onboardingProfileInputSchema,
  billingAddress: billingAddressInputSchema,
});

export type TOnboardingInput = z.infer<typeof onboardingInputSchema>;
