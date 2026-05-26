import { z } from 'zod';

// ---------------------------------------------------------------------------
// provisionUserCommandSchema — internal: orchestrator → apps/auth
// ---------------------------------------------------------------------------

export const provisionUserCommandSchema = z.object({
  email: z.email().max(320),
});

export type TProvisionUserCommand = z.infer<typeof provisionUserCommandSchema>;

// ---------------------------------------------------------------------------
// provisionUserOutputSchema — internal response from apps/auth
// ---------------------------------------------------------------------------

export const provisionUserOutputSchema = z.object({
  userId: z.uuid(),
  path: z.enum(['existing', 'provisioned']),
});

export type TProvisionUserOutput = z.infer<typeof provisionUserOutputSchema>;
