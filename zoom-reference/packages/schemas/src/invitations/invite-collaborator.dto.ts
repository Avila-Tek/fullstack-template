import { z } from 'zod';
import { billingAddressInputSchema } from '../shared/billing-address.schema';
import { permissionSetSchema } from '../shared/permission-set.schema';
import {
  documentInputSchema,
  phoneInputSchema,
  profileNamesSchema,
  refineProfileNames,
} from '../shared/profile-identity.schema';

// ---------------------------------------------------------------------------
// inviteCollaboratorInputSchema — public request body
// ---------------------------------------------------------------------------

export const inviteCollaboratorInputSchema = z.object({
  businessAccountId: z.uuid(),
  profile: z
    .object({
      ...profileNamesSchema.shape,
      ...documentInputSchema.shape,
      ...phoneInputSchema.shape,
    })
    .extend({ email: z.email().max(320) })
    .superRefine(refineProfileNames),
  billingAddress: billingAddressInputSchema,
  permissions: permissionSetSchema,
});

export type TInviteCollaboratorInput = z.infer<
  typeof inviteCollaboratorInputSchema
>;

// ---------------------------------------------------------------------------
// inviteCollaboratorOutputSchema — public response data
// ---------------------------------------------------------------------------

export const inviteCollaboratorOutputSchema = z.object({
  businessProfileId: z.uuid(),
  inviteId: z.uuid(),
});

export type TInviteCollaboratorOutput = z.infer<
  typeof inviteCollaboratorOutputSchema
>;
