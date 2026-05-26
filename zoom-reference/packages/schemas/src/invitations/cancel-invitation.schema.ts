import { z } from 'zod';

export const cancelInvitationCommandSchema = z.object({
  inviteId: z.uuid(),
  userId: z.uuid(),
});

export type TCancelInvitationCommand = z.infer<
  typeof cancelInvitationCommandSchema
>;

export const cancelInvitationOutputSchema = z.object({});

export type TCancelInvitationOutput = z.infer<
  typeof cancelInvitationOutputSchema
>;
