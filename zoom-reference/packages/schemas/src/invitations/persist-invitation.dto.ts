import { z } from 'zod';
import { geocodedBillingAddressSchema } from '../shared/billing-address.schema';
import { permissionSetSchema } from '../shared/permission-set.schema';
import { profileNamesSchema } from '../shared/profile-identity.schema';

export type { TGeocodedBillingAddress } from '../shared/billing-address.schema';
export type { TPermissionSet } from '../shared/permission-set.schema';
// Re-export for backward compatibility
export { permissionSetSchema } from '../shared/permission-set.schema';

// ---------------------------------------------------------------------------
// Sub-schemas for command decomposition
// ---------------------------------------------------------------------------

export const inviteeProfileSchema = profileNamesSchema.extend({
  // Auth identity (from apps/auth provisioning step)
  userId: z.uuid(),
  email: z.email().max(320),
  normalizedEmail: z.email().max(320),
  // Document
  documentTypeId: z.uuid(),
  documentType: z.string().min(1),
  documentNumber: z.string().min(1).max(30),
  // Phone
  phonePrefixId: z.uuid(),
  phonePrefix: z.string().min(1),
  phoneNumber: z.string().min(1).max(20),
});

export type TInviteeProfile = z.infer<typeof inviteeProfileSchema>;

// ---------------------------------------------------------------------------
// persistInvitationCommandSchema — internal: orchestrator → apps/api
// ---------------------------------------------------------------------------

export const persistInvitationCommandSchema = z.object({
  // Caller identity
  createdByUserId: z.uuid(),
  businessAccountId: z.uuid(),
  // Invitee profile: identity, document, name, and phone
  profile: inviteeProfileSchema,
  // Billing address enriched with geocoding data by the orchestrator
  billingAddress: geocodedBillingAddressSchema,
  // Role template + permissions
  permissions: permissionSetSchema,
});

export type TPersistInvitationCommand = z.infer<
  typeof persistInvitationCommandSchema
>;

// ---------------------------------------------------------------------------
// persistInvitationOutputSchema — internal response from apps/api
// ---------------------------------------------------------------------------

export const persistInvitationOutputSchema = z.object({
  businessProfileId: z.uuid(),
  inviteId: z.uuid(),
});

export type TPersistInvitationOutput = z.infer<
  typeof persistInvitationOutputSchema
>;
