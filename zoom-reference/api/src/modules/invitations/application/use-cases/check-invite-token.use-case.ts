import { Inject, Injectable } from '@nestjs/common';
import type {
	TCheckInviteTokenCommand,
	TCheckInviteTokenOutput,
} from '@zoom/schemas';
import { InviteToken } from '../../domain/value-objects/invite-token.value-object';
import { CheckInviteTokenUseCasePort } from '../ports/in/check-invite-token.use-case.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';

@Injectable()
export class CheckInviteTokenUseCase implements CheckInviteTokenUseCasePort {
	constructor(
		@Inject(InvitationRepositoryPort)
		private readonly repo: InvitationRepositoryPort,
	) {}

	async execute(
		cmd: TCheckInviteTokenCommand,
	): Promise<TCheckInviteTokenOutput> {
		const { hash } = InviteToken.fromPlaintext(cmd.token);
		const invite = await this.repo.findByTokenHash(hash);

		if (!invite) {
			return { status: 'invalid' };
		}

		if (invite.status === 'canceled') {
			return { status: 'canceled' };
		}

		if (invite.status === 'accepted') {
			return { status: 'already_accepted' };
		}

		if (invite.status === 'rejected') {
			return { status: 'invalid' };
		}

		return {
			status: 'valid',
			id: invite.id,
			email: invite.email,
			businessAccountName: invite.businessAccountName,
		};
	}
}
