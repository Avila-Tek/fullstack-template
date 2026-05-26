import { z } from 'zod';

// ---------------------------------------------------------------------------
// editMemberProfileOutputSchema
// Shared response for both the API internal endpoint and the orchestrator
// public endpoint.
// ---------------------------------------------------------------------------

export const editMemberProfileOutputSchema = z.object({
  updatedAt: z.string(),
});

export type TEditMemberProfileOutput = z.infer<
  typeof editMemberProfileOutputSchema
>;
