import { z } from 'zod';

// ---------------------------------------------------------------------------
// Internal command — POST /internal/profiles/update-collaborator-profile
// ---------------------------------------------------------------------------

const updateCollaboratorBillingAddressSchema = z.object({
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
    .describe('Country UUID. Inferred from stateId if null'),
  stateId: z.string().uuid().describe('State/Province UUID'),
  cityId: z.string().uuid().describe('City UUID'),
  municipalityId: z
    .string()
    .uuid()
    .nullable()
    .describe('Municipality UUID (optional)'),
  parishId: z.string().uuid().nullable().describe('Parish UUID (optional)'),
  postalCodeId: z
    .string()
    .uuid()
    .nullable()
    .describe('Postal code UUID (optional)'),
  geoLat: z.string().optional().describe('Latitude from geolocation provider'),
  geoLng: z.string().optional().describe('Longitude from geolocation provider'),
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
});

export const updateCollaboratorProfileCommandSchema = z.object({
  userId: z.string().uuid(),
  businessAccountId: z.string().uuid(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  legalName: z.string().min(3).max(200).optional(),
  mobilePhone: z
    .object({
      prefixId: z.string().uuid(),
      prefixValue: z.string(),
      number: z.string().regex(/^\d{7}$/),
    })
    .optional(),
  billingAddress: updateCollaboratorBillingAddressSchema.optional(),
});

export type TUpdateCollaboratorProfileCommand = z.infer<
  typeof updateCollaboratorProfileCommandSchema
>;

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export const updateCollaboratorProfileOutputSchema = z.object({
  updatedAt: z.string().datetime(),
});

export type TUpdateCollaboratorProfileOutput = z.infer<
  typeof updateCollaboratorProfileOutputSchema
>;
