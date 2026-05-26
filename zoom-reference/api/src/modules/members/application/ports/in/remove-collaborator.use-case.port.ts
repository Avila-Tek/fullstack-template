import type {
	TRemoveCollaboratorCommand,
	TRemoveCollaboratorOutput,
} from '@zoom/schemas';

export abstract class RemoveCollaboratorUseCasePort {
	abstract execute(
		cmd: TRemoveCollaboratorCommand,
	): Promise<TRemoveCollaboratorOutput>;
}
