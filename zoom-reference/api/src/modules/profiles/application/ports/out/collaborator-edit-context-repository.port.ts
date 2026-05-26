import type { TCollaboratorEditContext } from '@zoom/schemas';

export type CollaboratorEditContextRecord = TCollaboratorEditContext;

export abstract class CollaboratorEditContextRepositoryPort {
	abstract findByIdInAccount(
		collaboratorProfileId: string,
		businessAccountId: string,
	): Promise<CollaboratorEditContextRecord | null>;
}
