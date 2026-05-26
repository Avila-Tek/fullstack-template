import type {
	TRejectInvitationCommand,
	TRejectInvitationOutput,
} from '@zoom/schemas';

export abstract class RejectInvitationUseCasePort {
	abstract execute(
		cmd: TRejectInvitationCommand,
	): Promise<TRejectInvitationOutput>;
}
