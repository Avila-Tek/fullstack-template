import type {
	TCancelInvitationCommand,
	TCancelInvitationOutput,
} from '@zoom/schemas';

export abstract class CancelInvitationUseCasePort {
	abstract execute(
		cmd: TCancelInvitationCommand,
	): Promise<TCancelInvitationOutput>;
}
