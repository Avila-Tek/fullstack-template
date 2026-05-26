import { z } from 'zod';

// ---------------------------------------------------------------------------
// Internal command — POST /internal/profiles/sync-email
// ---------------------------------------------------------------------------

export const syncProfileEmailCommandSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
});

export type TSyncProfileEmailCommand = z.infer<
  typeof syncProfileEmailCommandSchema
>;

export const syncProfileEmailOutputSchema = z.object({
  updated: z.boolean(),
});

export type TSyncProfileEmailOutput = z.infer<
  typeof syncProfileEmailOutputSchema
>;
