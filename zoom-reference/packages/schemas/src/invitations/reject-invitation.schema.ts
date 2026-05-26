import { z } from 'zod';

export const rejectInvitationCommandSchema = z.object({
  inviteId: z.uuid(),
  userId: z.uuid(),
  normalizedEmail: z.string(),
});

export type TRejectInvitationCommand = z.infer<
  typeof rejectInvitationCommandSchema
>;

export const rejectInvitationOutputSchema = z.object({});

export type TRejectInvitationOutput = z.infer<
  typeof rejectInvitationOutputSchema
>;
