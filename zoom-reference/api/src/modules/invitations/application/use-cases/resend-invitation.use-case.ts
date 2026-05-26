import { Inject, Injectable } from '@nestjs/common';
import type {
	TResendInvitationCommand,
	TResendInvitationOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { EmailServicePort } from '../../../email/application/ports/out/email.service.port';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { InvitationNotFoundOrForbiddenException } from '../../domain/exceptions/invitation-not-found.exception';
import { InvitationNotPendingException } from '../../domain/exceptions/invitation-not-pending.exception';
import { InvitationOwnerOnlyException } from '../../domain/exceptions/invitation-owner-only.exception';
import { InviteToken } from '../../domain/value-objects/invite-token.value-object';
import { ResendInvitationUseCasePort } from '../ports/in/resend-invitation.use-case.port';
import { InvitationRepositoryPort } from '../ports/out/invitation-repository.port';

@Injectable()
export class ResendInvitationUseCase implements ResendInvitationUseCasePort {
	constructor(
		@Inject(InvitationRepositoryPort)
		private readonly invitationRepo: InvitationRepositoryPort,
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		cmd: TResendInvitationCommand,
	): Promise<TResendInvitationOutput> {
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

		const token = InviteToken.generate();
		const now = new Date();
		// Rotate token in DB immediately before sending email. If email delivery fails,
		// the old token is invalidated by design — caller will get a new link on resend retry.
		// This prevents indefinite use of stale tokens if email service is down.
		await this.invitationRepo.resend(invite.id, token.hash, cmd.userId, now);

		this.emailService
			.sendInvitationEmail(invite.email, token.plaintext)
			.then(() => {
				this.logger.info(
					{
						event: 'invitation.resend.email_sent',
						inviteId: invite.id,
					},
					'Resend invitation email sent',
				);
				recordApiEvent('invitation.resend.email_sent', {
					module: 'invitations',
					outcome: 'success',
				});
			})
			.catch((err: unknown) => {
				this.logger.warn(
					{
						event: 'invitation.resend.email_failed',
						inviteId: invite.id,
						error: err instanceof Error ? err.message : String(err),
					},
					'Resend invitation email delivery failed — invite remains active',
				);
				recordApiEvent('invitation.resend.email_failed', {
					module: 'invitations',
					outcome: 'failure',
				});
			});

		return {};
	}
}
