import { z } from 'zod';

export const termsAcceptanceStatusResponseSchema = z.object({
  requiresAcceptance: z.boolean(),
  activeVersion: z.string().nullable(),
  acceptedVersion: z.string().nullable(),
});

export type TTermsAcceptanceStatusResponse = z.infer<
  typeof termsAcceptanceStatusResponseSchema
>;
