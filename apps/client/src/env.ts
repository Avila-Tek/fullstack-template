import { z } from 'zod';

/**
 * Zod-validated environment variables for apps/client.
 *
 * Only NEXT_PUBLIC_* vars are available in the browser bundle.
 * Import this instead of reading process.env directly —
 * missing required vars will throw at startup rather than silently being undefined.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL:          z.string().url(),
  NEXT_PUBLIC_POSTHOG_HOST:     z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY:      z.string().optional(),
  NEXT_PUBLIC_FEATURE_FLAG_ENV: z.string().optional(),
});

// eslint-disable-next-line n/no-process-env
export const env = envSchema.parse(process.env);
