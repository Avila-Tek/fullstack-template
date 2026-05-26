import { z } from 'zod';

// ── Query ──

export const listRecipientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
  recipientType: z.enum(['guia', 'locker']).optional(),
  serviceScope: z.enum(['national', 'international']).optional(),
  status: z.enum(['active', 'suspended', 'all']).default('active'),
  starred: z
    .union([
      z.boolean(),
      z.enum(['true', 'false']).transform((v) => v === 'true'),
    ])
    .optional(),
});

export type TListRecipientsQuery = z.infer<typeof listRecipientsQuerySchema>;

// ── Response item ──

export const recipientListItemSchema = z.object({
  id: z.string().uuid(),
  alias: z.string().nullable(),
  name: z.string(),
  recipientType: z.enum(['guia', 'locker']),
  serviceScope: z.enum(['national', 'international']),
  status: z.enum(['active', 'suspended']),
  starred: z.boolean(),
  stateName: z.string().nullable(),
  cityName: z.string().nullable(),
  formattedAddress: z.string().nullable(),
  internationalCityText: z.string().nullable(),
  countryName: z.string().nullable(),
  lockerPrefix: z.string().nullable(),
  lockerCode: z.string().nullable(),
  ownerBusinessProfileId: z.string().uuid(),
  ownerName: z.string().nullable(),
  isBusinessAccountOwner: z.boolean(),
  createdAt: z.string().datetime(),
});

export type TRecipientListItem = z.infer<typeof recipientListItemSchema>;

// ── Response envelope ──

export const listRecipientsResponseSchema = z.object({
  items: z.array(recipientListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type TListRecipientsResponse = z.infer<
  typeof listRecipientsResponseSchema
>;

// ── Toggle favorite ──

export const toggleFavoriteInputSchema = z.object({
  starred: z.boolean(),
});

export type TToggleFavoriteInput = z.infer<typeof toggleFavoriteInputSchema>;

export const toggleFavoriteOutputSchema = z.object({
  id: z.string().uuid(),
  starred: z.boolean(),
  updatedAt: z.string().datetime(),
});

export type TToggleFavoriteOutput = z.infer<typeof toggleFavoriteOutputSchema>;
