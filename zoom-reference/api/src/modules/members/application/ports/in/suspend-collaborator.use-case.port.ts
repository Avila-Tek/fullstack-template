import type {
	TSuspendCollaboratorCommand,
	TSuspendCollaboratorOutput,
} from '@zoom/schemas';

export abstract class SuspendCollaboratorUseCasePort {
	abstract execute(
		cmd: TSuspendCollaboratorCommand,
	): Promise<TSuspendCollaboratorOutput>;
}
