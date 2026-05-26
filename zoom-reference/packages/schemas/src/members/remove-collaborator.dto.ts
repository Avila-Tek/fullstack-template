import { z } from 'zod';

export const removeCollaboratorCommandSchema = z.object({
  collaboratorProfileId: z.uuid(),
  userId: z.string(),
});

export type TRemoveCollaboratorCommand = z.infer<
  typeof removeCollaboratorCommandSchema
>;

export const removeCollaboratorOutputSchema = z.object({});

export type TRemoveCollaboratorOutput = z.infer<
  typeof removeCollaboratorOutputSchema
>;
