import { z } from 'zod';

// ---------------------------------------------------------------------------
// Internal command — POST /internal/profiles/update-business-account
// ---------------------------------------------------------------------------

export const updateBusinessAccountCommandSchema = z.object({
  userId: z.string().uuid(),
  businessAccountId: z.string().uuid(),
  legalName: z.string().min(3).max(200).optional(),
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  mobilePhone: z
    .object({
      prefixId: z.string().uuid(),
      prefixValue: z.string(),
      number: z.string().regex(/^\d{7}$/),
    })
    .optional(),
  billingAddress: z
    .object({
      addressLine1: z.string().describe('Street address'),
      formattedAddress: z
        .string()
        .optional()
        .describe(
          'Geocoded formatted address. Falls back to addressLine1 when absent'
        ),
      countryId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Country UUID. Inferred from stateId if not provided'),
      stateId: z.string().uuid().describe('State/Province UUID'),
      cityId: z.string().uuid().describe('City UUID'),
      municipalityId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Municipality UUID (optional)'),
      parishId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Parish UUID (optional)'),
      postalCodeId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Postal code UUID (optional)'),
      geoLat: z
        .string()
        .optional()
        .describe('Latitude from geolocation provider'),
      geoLng: z
        .string()
        .optional()
        .describe('Longitude from geolocation provider'),
      geoRawQuery: z
        .string()
        .optional()
        .describe('Raw query sent to geolocation provider'),
      geoProviderType: z
        .string()
        .optional()
        .describe('Provider type returned by geolocation'),
      geoRouteCode: z
        .string()
        .optional()
        .describe('Route code from geolocation provider'),
      geoProviderAddressId: z
        .string()
        .optional()
        .describe('Provider address ID from geolocation'),
      supportedByZoom: z
        .boolean()
        .optional()
        .describe('True when geolocation validation succeeded'),
      validatedAt: z
        .string()
        .datetime()
        .optional()
        .describe('ISO timestamp of geolocation validation'),
    })
    .nullable(),
});

export type TUpdateBusinessAccountCommand = z.infer<
  typeof updateBusinessAccountCommandSchema
>;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export const updateBusinessAccountOutputSchema = z.object({
  updatedAt: z.string().datetime(),
});

export type TUpdateBusinessAccountOutput = z.infer<
  typeof updateBusinessAccountOutputSchema
>;
