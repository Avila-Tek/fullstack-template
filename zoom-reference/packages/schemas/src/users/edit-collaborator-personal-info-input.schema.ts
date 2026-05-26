import { z } from 'zod';
import { billingAddressInputSchema } from '../shared/billing-address.schema';

export const editCollaboratorPersonalInfoInputSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  legalName: z.string().min(1).optional(),
  dniType: z.string().optional(),
  dniNumber: z.string().optional(),
  mobilePhone: z
    .object({
      prefixId: z.string().uuid(),
      number: z.string().regex(/^\d{7}$/),
    })
    .optional(),
  billingAddress: billingAddressInputSchema.optional(),
});

export type TEditCollaboratorPersonalInfoInput = z.infer<
  typeof editCollaboratorPersonalInfoInputSchema
>;
