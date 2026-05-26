import { z } from 'zod';
import { billingAddressInputSchema } from '../shared/billing-address.schema';
import { permissionSetSchema } from '../shared/permission-set.schema';

// ---------------------------------------------------------------------------
// editMemberProfileInputSchema
// PATCH /collaborators/:id — orchestrator public input
// ---------------------------------------------------------------------------

export const editMemberProfileInputSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  legalName: z.string().min(1).optional(),
  dniType: z.string().optional(),
  dniNumber: z.string().optional(),
  mobilePhone: z
    .object({
      prefixId: z.uuid(),
      number: z.string().min(1),
    })
    .optional(),
  billingAddress: billingAddressInputSchema.optional(),
  permissions: permissionSetSchema.optional(),
});

export type TEditMemberProfileInput = z.infer<
  typeof editMemberProfileInputSchema
>;
