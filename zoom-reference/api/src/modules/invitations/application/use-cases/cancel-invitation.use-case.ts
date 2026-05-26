import { Inject, Injectable } from '@nestjs/common';
import type {
	TCancelInvitationCommand,
	TCancelInvitationOutput,
} from '@zoom/schemas';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { InvitationNotFoundOrForbiddenException } from '../../domain/exceptions/invitation-not-found.exception';
import { InvitationNotPendingException } from '../../domain/exceptions/invitation-not-pending.exception';
import { InvitationOwnerOnlyException } from '../../domain/exceptions/invitation-owner-only.exception';
import { CancelInvitationUseCasePort } from '../ports/in/cancel-invitation.use-case.port';
import { InvitationCancellationUnitOfWorkPort } from '../ports/out/invitation-cancellation-unit-of-work.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';

@Injectable()
export class CancelInvitationUseCase implements CancelInvitationUseCasePort {
	constructor(
		@Inject(InvitationRepositoryPort)
		private readonly invitationRepo: InvitationRepositoryPort,
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(InvitationCancellationUnitOfWorkPort)
		private readonly unitOfWork: InvitationCancellationUnitOfWorkPort,
	) {}

	async execute(
		cmd: TCancelInvitationCommand,
	): Promise<TCancelInvitationOutput> {
		const invite = await this.invitationRepo.findById(cmd.inviteId);

		if (!invite) {
			throw new InvitationNotFoundOrForbiddenException({
				inviteId: cmd.inviteId,
			});
		}

		if (invite.status !== 'pending') {
			throw new InvitationNotPendingException({ inviteId: cmd.inviteId });
		}

		const owner = await this.businessProfileRepo.findOwnerInAccount(
			cmd.userId,
			invite.businessAccountId,
		);

		if (!owner) {
			throw new InvitationOwnerOnlyException({
				userId: cmd.userId,
				businessAccountId: invite.businessAccountId,
			});
		}

		const now = new Date();

		await this.unitOfWork.run(async (repos) => {
			await repos.businessProfile.softDeleteByInviteRejection(
				invite.businessProfileId,
				cmd.userId,
				now,
			);
			await repos.invite.cancel(invite.id, cmd.userId, now);
		});

		recordApiEvent('invitation.cancel.success', {
			module: 'invitations',
			outcome: 'success',
		});

		return {};
	}
}
