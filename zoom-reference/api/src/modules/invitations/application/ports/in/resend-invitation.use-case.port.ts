import type {
	TResendInvitationCommand,
	TResendInvitationOutput,
} from '@zoom/schemas';

export abstract class ResendInvitationUseCasePort {
	abstract execute(
		cmd: TResendInvitationCommand,
	): Promise<TResendInvitationOutput>;
}
