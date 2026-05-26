import { Inject, Injectable } from '@nestjs/common';
import type {
	TAcceptInvitationCommand,
	TAcceptInvitationOutput,
} from '@zoom/schemas';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { InvitationEmailMismatchException } from '../../domain/exceptions/invitation-email-mismatch.exception';
import { InvitationNotFoundOrForbiddenException } from '../../domain/exceptions/invitation-not-found.exception';
import { InvitationNotPendingException } from '../../domain/exceptions/invitation-not-pending.exception';
import { AcceptInvitationUseCasePort } from '../ports/in/accept-invitation.use-case.port';
import { InvitationAcceptanceUnitOfWorkPort } from '../ports/out/invitation-acceptance-unit-of-work.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';

@Injectable()
export class AcceptInvitationUseCase implements AcceptInvitationUseCasePort {
	constructor(
		@Inject(InvitationRepositoryPort)
		private readonly repo: InvitationRepositoryPort,
		@Inject(InvitationAcceptanceUnitOfWorkPort)
		private readonly unitOfWork: InvitationAcceptanceUnitOfWorkPort,
	) {}

	async execute(
		cmd: TAcceptInvitationCommand,
	): Promise<TAcceptInvitationOutput> {
		const invite = await this.repo.findById(cmd.inviteId);

		if (!invite) {
			throw new InvitationNotFoundOrForbiddenException({
				inviteId: cmd.inviteId,
			});
		}

		if (invite.status !== 'pending') {
			throw new InvitationNotPendingException({ inviteId: cmd.inviteId });
		}

		if (invite.normalizedEmail !== cmd.normalizedEmail) {
			throw new InvitationEmailMismatchException({ inviteId: cmd.inviteId });
		}

		const now = new Date();

		await this.unitOfWork.run(async (repos) => {
			await repos.businessProfile.activateByInvite(
				invite.businessProfileId,
				cmd.userId,
				now,
			);
			await repos.invite.accept(invite.id, cmd.userId, now);
		});

		recordApiEvent('invitation.accept.success', {
			module: 'invitations',
			outcome: 'success',
		});

		return {
			businessProfileId: invite.businessProfileId,
			businessAccountId: invite.businessAccountId,
		};
	}
}
