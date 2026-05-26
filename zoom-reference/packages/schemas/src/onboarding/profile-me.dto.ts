import { z } from 'zod';

// ---------------------------------------------------------------------------
// profileMeOutputSchema
// ---------------------------------------------------------------------------

export const pendingInvitationSchema = z.object({
  id: z.uuid(),
  businessAccountName: z.string(),
  role: z.enum(['member']),
});

export type TPendingInvitation = z.infer<typeof pendingInvitationSchema>;

export const profileMeOutputSchema = z.object({
  onboardingComplete: z.boolean(),
  businessAccountId: z.uuid().nullable(),
  pendingInvitation: pendingInvitationSchema.nullable(),
});

export type TProfileMeOutput = z.infer<typeof profileMeOutputSchema>;
