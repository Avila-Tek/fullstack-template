import { z } from 'zod';

const YOUTUBE_URL_REGEX =
  /^https?:\/\/(?:(?:www\.|m\.)?youtube(?:-nocookie)?\.com|youtu\.be)(?=[/?#:]|$)/;

const APP_SECTIONS = [
  'users',
  'settings',
  'profile',
  'tracking',
  'dashboard',
  'quotation_tool',
  'pre_shipments',
  'public_home',
] as const;

export const TutorialVideoItemSchema = z.object({
  id: z.string().uuid(),
  section_key: z.enum(APP_SECTIONS),
  title: z.string().min(1).max(255),
  youtube_url: z
    .string()
    .url()
    .refine((url) => YOUTUBE_URL_REGEX.test(url), {
      message: 'Must be a valid YouTube URL',
    }),
  youtube_video_id: z.string().max(50).optional().nullable(),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().nonnegative(),
  is_deleted: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const TutorialVideoPublicItemSchema = TutorialVideoItemSchema.omit({
  is_deleted: true,
});

export const GetPublicTutorialVideoResponseSchema = z.object({
  video: TutorialVideoPublicItemSchema.nullable(),
});

export type TTutorialVideoItem = z.infer<typeof TutorialVideoItemSchema>;
export type TTutorialVideoPublicItem = z.infer<
  typeof TutorialVideoPublicItemSchema
>;
export type TGetPublicTutorialVideoResponse = z.infer<
  typeof GetPublicTutorialVideoResponseSchema
>;
