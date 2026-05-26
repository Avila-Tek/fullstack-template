import { z } from 'zod';

export const resendInvitationCommandSchema = z.object({
  inviteId: z.uuid(),
  userId: z.uuid(),
});

export type TResendInvitationCommand = z.infer<
  typeof resendInvitationCommandSchema
>;

export const resendInvitationOutputSchema = z.object({});

export type TResendInvitationOutput = z.infer<
  typeof resendInvitationOutputSchema
>;
