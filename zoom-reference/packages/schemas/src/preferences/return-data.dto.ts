import { z } from 'zod';

export const returnTypeItemSchema = z.object({
  id: z.string().uuid(),
  legacyId: z.number().int(),
  name: z.string(),
});

export const resolvedAddressSchema = z.object({
  addressId: z.string().uuid(),
  cityName: z.string(),
  stateName: z.string(),
  addressLine: z.string(),
});

const resolvedOfficeSchema = z.object({
  officeId: z.string().uuid(),
  officeName: z.string(),
});

const cityItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const officeItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const getReturnTypesOutputSchema = z.array(returnTypeItemSchema);
export type TGetReturnTypesOutput = z.infer<typeof getReturnTypesOutputSchema>;

export const getReturnDataOutputSchema = z.object({
  returnType: returnTypeItemSchema,
  returnTo: z.enum(['address', 'office']).nullable(),
  address: resolvedAddressSchema.nullable(),
  office: resolvedOfficeSchema.nullable(),
});
export type TGetReturnDataOutput = z.infer<typeof getReturnDataOutputSchema>;

export const getProfileAddressOutputSchema = resolvedAddressSchema;
export type TGetProfileAddressOutput = z.infer<
  typeof getProfileAddressOutputSchema
>;

export const updateReturnDataInputSchema = z.object({
  returnTypeId: z.string().uuid(),
  returnTo: z.enum(['address', 'office']).nullable().optional(),
  returnOfficeId: z.string().uuid().nullable().optional(),
});
export type TUpdateReturnDataInput = z.infer<
  typeof updateReturnDataInputSchema
>;

export const getCitiesWithOfficesOutputSchema = z.array(cityItemSchema);
export type TGetCitiesWithOfficesOutput = z.infer<
  typeof getCitiesWithOfficesOutputSchema
>;

export const getOfficesByCityOutputSchema = z.array(officeItemSchema);
export type TGetOfficesByCityOutput = z.infer<
  typeof getOfficesByCityOutputSchema
>;
