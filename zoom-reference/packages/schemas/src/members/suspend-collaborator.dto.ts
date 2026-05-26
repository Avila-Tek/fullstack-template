import { z } from 'zod';

export const suspendCollaboratorCommandSchema = z.object({
  collaboratorProfileId: z.uuid(),
  userId: z.string(),
});

export type TSuspendCollaboratorCommand = z.infer<
  typeof suspendCollaboratorCommandSchema
>;

export const suspendCollaboratorOutputSchema = z.object({});

export type TSuspendCollaboratorOutput = z.infer<
  typeof suspendCollaboratorOutputSchema
>;
