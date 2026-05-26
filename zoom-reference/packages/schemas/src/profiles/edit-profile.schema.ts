import { z } from 'zod';

// ---------------------------------------------------------------------------
// Edit profile input — PATCH /profiles
// Server determines owner vs member path from the edit context (JWT role).
// Members can update: firstName, lastName, legalName (if entity), mobilePhone, billingAddress.
// Owners can update all fields.
// ---------------------------------------------------------------------------

export const editProfileInputSchema = z
  .object({
    // shared
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    mobilePhone: z
      .object({
        prefixId: z.string().uuid(),
        number: z.string().regex(/^\d{7}$/),
      })
      .optional(),
    // shared (owner-only in sync to CORE, but members can update locally; used by entities)
    legalName: z
      .string()
      .min(3)
      .max(200)
      .optional()
      .describe('Optional. Legal name for entities (documentType J)'),
    // shared (owner-only in sync to CORE, but members can update locally)
    billingAddress: z
      .object({
        addressLine1: z
          .string()
          .min(1)
          .max(200)
          .describe('Required. Street address'),
        countryId: z
          .string()
          .uuid()
          .optional()
          .describe('Optional. Inferred from stateId if not provided'),
        stateId: z.string().uuid().describe('Required. State/Province UUID'),
        cityId: z.string().uuid().describe('Required. City UUID'),
        municipalityId: z
          .string()
          .uuid()
          .optional()
          .describe('Optional. Municipality UUID'),
        parishId: z
          .string()
          .uuid()
          .optional()
          .describe('Optional. Parish UUID'),
        postalCodeId: z
          .string()
          .uuid()
          .optional()
          .describe('Optional. Postal code UUID'),
      })
      .optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided for update',
  });

export type TEditProfileInput = z.infer<typeof editProfileInputSchema>;

// ---------------------------------------------------------------------------
// Response — shared by both paths
// ---------------------------------------------------------------------------

export const editProfileResponseSchema = z.object({
  updatedAt: z.string().datetime(),
  role: z.enum(['owner', 'member']),
});

export type TEditProfileResponse = z.infer<typeof editProfileResponseSchema>;
