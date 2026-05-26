import { Inject, Injectable } from '@nestjs/common';
import type {
	TRejectInvitationCommand,
	TRejectInvitationOutput,
} from '@zoom/schemas';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { InvitationEmailMismatchException } from '../../domain/exceptions/invitation-email-mismatch.exception';
import { InvitationNotFoundOrForbiddenException } from '../../domain/exceptions/invitation-not-found.exception';
import { InvitationNotPendingException } from '../../domain/exceptions/invitation-not-pending.exception';
import { RejectInvitationUseCasePort } from '../ports/in/reject-invitation.use-case.port';
import { InvitationRejectionUnitOfWorkPort } from '../ports/out/invitation-rejection-unit-of-work.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';

@Injectable()
export class RejectInvitationUseCase implements RejectInvitationUseCasePort {
	constructor(
		@Inject(InvitationRepositoryPort)
		private readonly repo: InvitationRepositoryPort,
		@Inject(InvitationRejectionUnitOfWorkPort)
		private readonly unitOfWork: InvitationRejectionUnitOfWorkPort,
	) {}

	async execute(
		cmd: TRejectInvitationCommand,
	): Promise<TRejectInvitationOutput> {
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
			await repos.businessProfile.softDeleteByInviteRejection(
				invite.businessProfileId,
				cmd.userId,
				now,
			);
			await repos.invite.reject(invite.id, cmd.userId, now);
		});

		recordApiEvent('invitation.reject.success', {
			module: 'invitations',
			outcome: 'success',
		});

		return {};
	}
}
