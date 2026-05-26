import { Inject, Injectable } from '@nestjs/common';
import type {
	TRemoveCollaboratorCommand,
	TRemoveCollaboratorOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { EmailServicePort } from '../../../email/application/ports/out/email.service.port';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { MembersInvalidStatusException } from '../../domain/exceptions/members-invalid-status.exception';
import { MembersNotFoundException } from '../../domain/exceptions/members-not-found.exception';
import { MembersOwnerOnlyException } from '../../domain/exceptions/members-owner-only.exception';
import { RemoveCollaboratorUseCasePort } from '../ports/in/remove-collaborator.use-case.port';

@Injectable()
export class RemoveCollaboratorUseCase
	implements RemoveCollaboratorUseCasePort
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
		cmd: TRemoveCollaboratorCommand,
	): Promise<TRemoveCollaboratorOutput> {
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

		if (collaborator.status === 'invited') {
			throw new MembersInvalidStatusException({
				collaboratorProfileId: cmd.collaboratorProfileId,
				status: collaborator.status,
			});
		}

		const now = new Date();
		await this.businessProfileRepo.removeCollaborator(
			cmd.collaboratorProfileId,
			cmd.userId,
			now,
		);

		if (collaborator.email) {
			this.emailService
				.sendCollaboratorRemovedEmail(collaborator.email)
				.then(() => {
					this.logger.info(
						{
							event: 'collaborator.remove.email_sent',
							collaboratorProfileId: cmd.collaboratorProfileId,
						},
						'Collaborator removal email sent',
					);
					recordApiEvent('collaborator.remove.email_sent', {
						module: 'members',
						outcome: 'success',
					});
				})
				.catch((err: unknown) => {
					this.logger.warn(
						{
							event: 'collaborator.remove.email_failed',
							collaboratorProfileId: cmd.collaboratorProfileId,
							error: err instanceof Error ? err.message : String(err),
						},
						'Collaborator removal email delivery failed — removal remains active',
					);
					recordApiEvent('collaborator.remove.email_failed', {
						module: 'members',
						outcome: 'failure',
					});
				});
		}

		this.logger.info(
			{
				event: 'collaborator.remove.success',
				collaboratorProfileId: cmd.collaboratorProfileId,
				removedByUserId: cmd.userId,
			},
			'Collaborator removed successfully',
		);
		recordApiEvent('collaborator.remove.success', {
			module: 'members',
			outcome: 'success',
		});

		return {};
	}
}
