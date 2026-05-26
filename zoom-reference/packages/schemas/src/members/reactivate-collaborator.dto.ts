import { z } from 'zod';

export const reactivateCollaboratorCommandSchema = z.object({
  collaboratorProfileId: z.uuid(),
  userId: z.string(),
});

export type TReactivateCollaboratorCommand = z.infer<
  typeof reactivateCollaboratorCommandSchema
>;

export const reactivateCollaboratorOutputSchema = z.object({});

export type TReactivateCollaboratorOutput = z.infer<
  typeof reactivateCollaboratorOutputSchema
>;
