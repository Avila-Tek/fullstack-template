import { z } from 'zod';

// ---------------------------------------------------------------------------
// billingAddressInputSchema — base input, includes optional region text fields
// so sagas can pass them to geocoding without a separate type.
// ---------------------------------------------------------------------------

export const billingAddressInputSchema = z.object({
  addressLine1: z.string().min(5).max(100),
  addressLine2: z.string().optional(),
  suburbText: z.string().max(120).optional(),
  postalCodeText: z.string().max(20).optional(),
  internationalCityText: z.string().max(150).optional(),
  countryId: z.uuid().optional(),
  stateText: z.string().max(120).optional(),
  cityText: z.string().max(120).optional(),
  municipalityText: z.string().max(120).optional(),
  stateId: z.uuid().optional(),
  cityId: z.uuid().optional(),
  municipalityId: z.uuid().optional(),
  parishId: z.uuid().optional(),
  postalCodeId: z.uuid().optional(),
});

export type TBillingAddressInput = z.infer<typeof billingAddressInputSchema>;

// ---------------------------------------------------------------------------
// geocodedBillingAddressSchema — billingAddressInputSchema + geo fields
// added by the orchestrator after calling the geocoding service.
// ---------------------------------------------------------------------------

export const geocodedBillingAddressSchema = billingAddressInputSchema.extend({
  // countryId is always resolved by the orchestrator before persist
  countryId: z.uuid(),
  formattedAddress: z.string().optional(),
  rawQuery: z.string().optional(),
  geoLat: z.number().optional(),
  geoLng: z.number().optional(),
  geolocationProvider: z.string().max(50).optional(),
  providerAddressId: z.coerce.string().max(50).optional(),
  providerRouteCode: z.string().max(50).optional(),
  supportedByZoom: z.boolean().optional(),
  validatedAt: z.coerce.date().optional(),
});

export type TGeocodedBillingAddress = z.infer<
  typeof geocodedBillingAddressSchema
>;
