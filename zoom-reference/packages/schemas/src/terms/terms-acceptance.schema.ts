import { z } from 'zod';

export const termsAcceptanceResponseSchema = z.object({
  accepted: z.literal(true),
  version: z.string(),
});

export type TTermsAcceptanceResponse = z.infer<
  typeof termsAcceptanceResponseSchema
>;
