import type {
	TReactivateCollaboratorCommand,
	TReactivateCollaboratorOutput,
} from '@zoom/schemas';

export abstract class ReactivateCollaboratorUseCasePort {
	abstract execute(
		cmd: TReactivateCollaboratorCommand,
	): Promise<TReactivateCollaboratorOutput>;
}
