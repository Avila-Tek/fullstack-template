import { z } from 'zod';
import { geocodedBillingAddressSchema } from '../shared/billing-address.schema';
import { profileNamesSchema } from '../shared/profile-identity.schema';

export type { TGeocodedBillingAddress } from '../shared/billing-address.schema';

// ---------------------------------------------------------------------------
// onboarderProfileSchema — owner profile identity, document, name, and phone
// ---------------------------------------------------------------------------

export const onboarderProfileSchema = profileNamesSchema.extend({
  // Auth identity (from apps/auth provisioning step)
  userId: z.uuid(),
  email: z.email().max(320),
  // Document
  documentTypeId: z.uuid(),
  documentType: z.string().min(1),
  documentNumber: z.string().min(1).max(30),
  // Phone
  phonePrefixId: z.uuid(),
  phonePrefix: z.string().min(1),
  phoneNumber: z.string().min(1).max(20),
  // legalName is always computed by the orchestrator before persist
  legalName: z.string().min(1).max(200),
});

export type TOnboarderProfile = z.infer<typeof onboarderProfileSchema>;

// ---------------------------------------------------------------------------
// persistOnboardingCommandSchema — internal: orchestrator → apps/api
// ---------------------------------------------------------------------------

export const persistOnboardingCommandSchema = z.object({
  // Onboarder profile: identity, document, name, and phone
  profile: onboarderProfileSchema,
  // Billing address enriched with geocoding data by the orchestrator
  billingAddress: geocodedBillingAddressSchema,
  clientCode: z.string().min(1),
  clientStatus: z.enum(['active', 'inactive']),
});

export type TPersistOnboardingCommand = z.infer<
  typeof persistOnboardingCommandSchema
>;

// ---------------------------------------------------------------------------
// persistOnboardingOutputSchema — internal response from apps/api
// ---------------------------------------------------------------------------

export const persistOnboardingOutputSchema = z.object({
  businessAccountId: z.uuid(),
});

export type TPersistOnboardingOutput = z.infer<
  typeof persistOnboardingOutputSchema
>;
