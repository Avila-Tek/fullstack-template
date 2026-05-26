import { z } from 'zod';

export const RECIPIENT_LOCKER_INVALID_CODE =
  'RECIPIENTS_LOCKER_INVALID' as const;

export const createRecipientLockerInputSchema = z.object({
  siglas: z.string().length(3),
  locker_number: z.coerce.number().int().min(1),
  contact_name: z.string().trim().min(1).max(150),
  alias: z.string().max(150).optional(),
  cellphone_prefix_id: z.string().uuid(),
  cellphone_number: z.string().trim().min(1).max(20),
  observation: z.string().optional(),
});

export type TCreateRecipientLockerInput = z.infer<
  typeof createRecipientLockerInputSchema
>;

export const createRecipientLockerOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  alias: z.string().nullable().optional(),
  delivery_type: z.literal('locker'),
  service_scope: z.literal('national'),
  status: z.enum(['active', 'suspended']),
  business_account_id: z.string().uuid(),
  created_at: z.string(),
});

export type TCreateRecipientLockerOutput = z.infer<
  typeof createRecipientLockerOutputSchema
>;

export const createRecipientLockerInternalSchema =
  createRecipientLockerInputSchema.extend({
    user_id: z.string().uuid(),
    business_account_id: z.string().uuid(),
    owner_business_profile_id: z.string().uuid(),
    is_business_account_owner: z.boolean(),
  });

export type TCreateRecipientLockerInternalInput = z.infer<
  typeof createRecipientLockerInternalSchema
>;
