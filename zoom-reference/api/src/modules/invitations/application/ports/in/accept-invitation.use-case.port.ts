import type {
	TAcceptInvitationCommand,
	TAcceptInvitationOutput,
} from '@zoom/schemas';

export abstract class AcceptInvitationUseCasePort {
	abstract execute(
		cmd: TAcceptInvitationCommand,
	): Promise<TAcceptInvitationOutput>;
}
