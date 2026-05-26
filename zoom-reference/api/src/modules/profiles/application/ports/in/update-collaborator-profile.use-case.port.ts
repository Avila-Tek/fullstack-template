import type {
	TUpdateCollaboratorProfileCommand,
	TUpdateCollaboratorProfileOutput,
} from '@zoom/schemas';

export abstract class UpdateCollaboratorProfileUseCasePort {
	abstract execute(
		cmd: TUpdateCollaboratorProfileCommand,
	): Promise<TUpdateCollaboratorProfileOutput>;
}
