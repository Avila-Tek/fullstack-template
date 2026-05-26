import { z } from 'zod';

export const createRecipientInternationalInputSchema = z.object({
  name: z.string().min(1).max(150),
  alias: z.string().max(150).optional(),
  international_document: z.string().max(30).optional(),
  international_shipping_country_code: z.string().min(2).max(5),
  international_shipping_country_name: z.string().min(1),
  international_shipping_city_name: z.string().min(1),
  international_shipping_city_zip_code: z.string().optional(),
  international_shipping_city_suburb: z.string().optional(),
  address_long: z.string().min(1),
  locality: z.string().optional(),
  contact_name: z.string().min(1).max(150),
  international_cellphone_prefix_id: z.string().uuid(),
  cellphone_number: z.string().min(1).max(20),
  international_phone_prefix_id: z.string().uuid().optional(),
  phone_number: z.string().max(20).optional(),
  email: z.string().email().max(320).optional(),
  observation: z.string().optional(),
});

export type TCreateRecipientInternationalInput = z.infer<
  typeof createRecipientInternationalInputSchema
>;

export const createRecipientInternationalOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  alias: z.string().nullable().optional(),
  delivery_type: z.literal('guia'),
  service_scope: z.literal('international'),
  status: z.enum(['active', 'suspended']),
  business_account_id: z.string().uuid(),
  created_at: z.string(),
});

export type TCreateRecipientInternationalOutput = z.infer<
  typeof createRecipientInternationalOutputSchema
>;
