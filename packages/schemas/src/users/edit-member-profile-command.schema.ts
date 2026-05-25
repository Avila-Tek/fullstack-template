import { z } from 'zod';
import { geocodedBillingAddressSchema } from '../shared/billing-address.schema';
import { permissionSetSchema } from '../shared/permission-set.schema';

// ---------------------------------------------------------------------------
// editMemberProfileCommandSchema
// POST /internal/profiles/edit-member-profile — enriched payload
// sent from orchestrator to API after geocoding resolution.
// ---------------------------------------------------------------------------

export const editMemberProfileCommandSchema = z.object({
  callerUserId: z.uuid(),
  collaboratorProfileId: z.uuid(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  legalName: z.string().min(1).optional(),
  dniType: z.string().optional(),
  dniNumber: z.string().optional(),
  mobilePhone: z
    .object({
      prefixId: z.uuid(),
      prefixValue: z.string(),
      number: z.string(),
    })
    .optional(),
  // Geo-enriched when address changed; absent when unchanged
  billingAddress: geocodedBillingAddressSchema.optional(),
  permissions: permissionSetSchema.optional(),
});

export type TEditMemberProfileCommand = z.infer<
  typeof editMemberProfileCommandSchema
>;
