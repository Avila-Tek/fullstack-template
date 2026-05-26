import type {
	TValidateInvitationCommand,
	TValidateInvitationOutput,
} from '@zoom/schemas';

export abstract class ValidateInvitationUseCasePort {
	abstract execute(
		cmd: TValidateInvitationCommand,
	): Promise<TValidateInvitationOutput>;
}
