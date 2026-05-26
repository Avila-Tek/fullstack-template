import { Inject, Injectable } from '@nestjs/common';
import type {
	TReactivateCollaboratorCommand,
	TReactivateCollaboratorOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { EmailServicePort } from '../../../email/application/ports/out/email.service.port';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { MembersInvalidStatusException } from '../../domain/exceptions/members-invalid-status.exception';
import { MembersNotFoundException } from '../../domain/exceptions/members-not-found.exception';
import { MembersOwnerOnlyException } from '../../domain/exceptions/members-owner-only.exception';
import { ReactivateCollaboratorUseCasePort } from '../ports/in/reactivate-collaborator.use-case.port';

@Injectable()
export class ReactivateCollaboratorUseCase
	implements ReactivateCollaboratorUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		cmd: TReactivateCollaboratorCommand,
	): Promise<TReactivateCollaboratorOutput> {
		const collaborator = await this.businessProfileRepo.findCollaboratorById(
			cmd.collaboratorProfileId,
		);

		if (!collaborator) {
			throw new MembersNotFoundException({
				collaboratorProfileId: cmd.collaboratorProfileId,
			});
		}

		const owner = await this.businessProfileRepo.findOwnerInAccount(
			cmd.userId,
			collaborator.businessAccountId,
		);

		if (!owner) {
			throw new MembersOwnerOnlyException();
		}

		if (collaborator.status === 'active') {
			this.logger.info(
				{
					event: 'collaborator.reactivate.already_active',
					collaboratorProfileId: cmd.collaboratorProfileId,
				},
				'Collaborator already active — no action taken',
			);
			recordApiEvent('collaborator.reactivate.already_active', {
				module: 'members',
				outcome: 'noop',
			});
			return {};
		}

		if (collaborator.status !== 'suspended') {
			throw new MembersInvalidStatusException({
				collaboratorProfileId: cmd.collaboratorProfileId,
				status: collaborator.status,
			});
		}

		await this.businessProfileRepo.reactivateCollaborator(
			cmd.collaboratorProfileId,
		);

		if (collaborator.email) {
			this.emailService
				.sendCollaboratorReactivatedEmail(collaborator.email)
				.then(() => {
					this.logger.info(
						{
							event: 'collaborator.reactivate.email_sent',
							collaboratorProfileId: cmd.collaboratorProfileId,
						},
						'Collaborator reactivation email sent',
					);
					recordApiEvent('collaborator.reactivate.email_sent', {
						module: 'members',
						outcome: 'success',
					});
				})
				.catch((err: unknown) => {
					this.logger.warn(
						{
							event: 'collaborator.reactivate.email_failed',
							collaboratorProfileId: cmd.collaboratorProfileId,
							error: err instanceof Error ? err.message : String(err),
						},
						'Collaborator reactivation email delivery failed — reactivation remains active',
					);
					recordApiEvent('collaborator.reactivate.email_failed', {
						module: 'members',
						outcome: 'failure',
					});
				});
		}

		this.logger.info(
			{
				event: 'collaborator.reactivate.success',
				collaboratorProfileId: cmd.collaboratorProfileId,
				reactivatedByUserId: cmd.userId,
			},
			'Collaborator reactivated successfully',
		);
		recordApiEvent('collaborator.reactivate.success', {
			module: 'members',
			outcome: 'success',
		});

		return {};
	}
}
