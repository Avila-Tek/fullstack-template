import { z } from 'zod';

export const stateItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type TStateItem = z.infer<typeof stateItemSchema>;

export const cityItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type TCityItem = z.infer<typeof cityItemSchema>;

export const municipalityItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type TMunicipalityItem = z.infer<typeof municipalityItemSchema>;

export const parishItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type TParishItem = z.infer<typeof parishItemSchema>;

export const postalCodeItemSchema = z.object({
  id: z.uuid(),
  postalCode: z.string(),
});
export type TPostalCodeItem = z.infer<typeof postalCodeItemSchema>;
