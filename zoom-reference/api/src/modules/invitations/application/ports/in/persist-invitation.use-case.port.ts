import type {
	TPersistInvitationCommand,
	TPersistInvitationOutput,
} from '@zoom/schemas';

export abstract class PersistInvitationUseCasePort {
	abstract execute(
		cmd: TPersistInvitationCommand,
	): Promise<TPersistInvitationOutput>;
}
