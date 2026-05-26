import { z } from 'zod';

export const documentTypeItemSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});
export type TDocumentTypeItem = z.infer<typeof documentTypeItemSchema>;

export const phonePrefixItemSchema = z.object({
  id: z.uuid(),
  prefix: z.string(),
  carrierName: z.string(),
  prefixType: z.string().nullable(),
});
export type TPhonePrefixItem = z.infer<typeof phonePrefixItemSchema>;

export const internationalPhonePrefixItemSchema = z.object({
  id: z.uuid(),
  countryPrefix: z.string(),
  countryIsoCode: z.string(),
  carrierName: z.string(),
});
export type TInternationalPhonePrefixItem = z.infer<
  typeof internationalPhonePrefixItemSchema
>;
