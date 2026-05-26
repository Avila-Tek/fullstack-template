import { z } from 'zod';

export const currentUserResponseSchema = z.object({
  legalName: z.string().nullable(),
  businessProfileId: z.string(),
  email: z.string().nullable(),
  clientCodeLastFour: z.string().length(4),
  coreClientStatus: z.enum(['active', 'inactive']),
});

export type TCurrentUserResponse = z.infer<typeof currentUserResponseSchema>;

export type TCoreClientStatus = TCurrentUserResponse['coreClientStatus'];
