import { z } from 'zod';

export const createRecipientNationalInputSchema = z.object({
  name: z.string().min(1).max(150),
  alias: z.string().max(150).optional(),
  document_type_id: z.string().uuid(),
  document_number: z.string().min(1).max(30),
  state_id: z.string().uuid(),
  city_id: z.string().uuid(),
  address_long: z.string().min(1),
  contact_name: z.string().min(1).max(150),
  cellphone_prefix_id: z.string().uuid(),
  cellphone_number: z.string().min(1).max(20),
  locality: z.string().optional(),
  phone_prefix_id: z.string().uuid().optional(),
  phone_number: z.string().max(20).optional(),
  email: z.string().email().max(320).optional(),
  observation: z.string().optional(),
});

export type TCreateRecipientNationalInput = z.infer<
  typeof createRecipientNationalInputSchema
>;

export const createRecipientNationalOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  alias: z.string().nullable().optional(),
  delivery_type: z.literal('guia'),
  service_scope: z.literal('national'),
  status: z.enum(['active', 'suspended']),
  business_account_id: z.string().uuid(),
  created_at: z.string(),
});

export type TCreateRecipientNationalOutput = z.infer<
  typeof createRecipientNationalOutputSchema
>;
