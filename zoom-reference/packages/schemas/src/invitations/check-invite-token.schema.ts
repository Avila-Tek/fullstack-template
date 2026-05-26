import { z } from 'zod';

export const checkInviteTokenCommandSchema = z.object({
  token: z.string().min(1),
});

export type TCheckInviteTokenCommand = z.infer<
  typeof checkInviteTokenCommandSchema
>;

export const checkInviteTokenOutputSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('valid'),
    id: z.uuid(),
    email: z.email(),
    businessAccountName: z.string(),
  }),
  z.object({ status: z.literal('invalid') }),
  z.object({ status: z.literal('canceled') }),
  z.object({ status: z.literal('already_accepted') }),
]);

export type TCheckInviteTokenOutput = z.infer<
  typeof checkInviteTokenOutputSchema
>;
