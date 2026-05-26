import { z } from 'zod';

export const acceptInvitationCommandSchema = z.object({
  inviteId: z.uuid(),
  userId: z.uuid(),
  normalizedEmail: z.string().toLowerCase(),
});

export type TAcceptInvitationCommand = z.infer<
  typeof acceptInvitationCommandSchema
>;

export const acceptInvitationOutputSchema = z.object({
  businessProfileId: z.uuid(),
  businessAccountId: z.uuid(),
});

export type TAcceptInvitationOutput = z.infer<
  typeof acceptInvitationOutputSchema
>;
