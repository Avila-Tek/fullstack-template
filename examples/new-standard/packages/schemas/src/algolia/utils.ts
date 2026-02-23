import { z } from 'zod';

export const algoliaTimestampSchema = z.number().optional();

export const ALGOLIA_INDEX_NAMES = {
  HABITS: 'habits',
} as const;

export type AlgoliaIndexName =
  (typeof ALGOLIA_INDEX_NAMES)[keyof typeof ALGOLIA_INDEX_NAMES];

export const searchApiKeyResponseSchema = z.object({
  apiKey: z.string(),
  appId: z.string(),
  indexName: z.enum([ALGOLIA_INDEX_NAMES.HABITS]),
});

export type TSearchApiKeyResponse = z.infer<typeof searchApiKeyResponseSchema>;
