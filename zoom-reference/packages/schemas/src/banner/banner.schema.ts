import { z } from 'zod';

export const BannerItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().nullable().optional(),
  order: z.number().int().nullable().optional(),
  status: z.enum(['published', 'draft']),
  title: z.string().min(1),
  type: z.enum(['mobile', 'desktop']),
});

export const BannerManifestSchema = z.object({
  banners: z.array(BannerItemSchema),
});

export const BannerPayloadSchema = z.object({
  desktop: BannerItemSchema.array(),
  mobile: BannerItemSchema.array(),
});

export type BannerItem = z.infer<typeof BannerItemSchema>;
export type BannerManifest = z.infer<typeof BannerManifestSchema>;
export type BannerPayload = z.infer<typeof BannerPayloadSchema>;
