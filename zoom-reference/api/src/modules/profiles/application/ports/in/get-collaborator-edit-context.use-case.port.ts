import type { TCollaboratorEditContext } from '@zoom/schemas';

export abstract class GetCollaboratorEditContextUseCasePort {
	abstract execute(
		callerUserId: string,
		collaboratorProfileId: string,
	): Promise<TCollaboratorEditContext>;
}
