import { Inject, Injectable } from '@nestjs/common';
import type {
	TSuspendCollaboratorCommand,
	TSuspendCollaboratorOutput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { EmailServicePort } from '../../../email/application/ports/out/email.service.port';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { MembersInvalidStatusException } from '../../domain/exceptions/members-invalid-status.exception';
import { MembersNotFoundException } from '../../domain/exceptions/members-not-found.exception';
import { MembersOwnerOnlyException } from '../../domain/exceptions/members-owner-only.exception';
import { SuspendCollaboratorUseCasePort } from '../ports/in/suspend-collaborator.use-case.port';

@Injectable()
export class SuspendCollaboratorUseCase
	implements SuspendCollaboratorUseCasePort
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
		cmd: TSuspendCollaboratorCommand,
	): Promise<TSuspendCollaboratorOutput> {
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

		if (collaborator.status === 'suspended') {
			this.logger.info(
				{
					event: 'collaborator.suspend.already_suspended',
					collaboratorProfileId: cmd.collaboratorProfileId,
				},
				'Collaborator already suspended — no action taken',
			);
			recordApiEvent('collaborator.suspend.already_suspended', {
				module: 'members',
				outcome: 'noop',
			});
			return {};
		}

		if (collaborator.status !== 'active') {
			throw new MembersInvalidStatusException({
				collaboratorProfileId: cmd.collaboratorProfileId,
				status: collaborator.status,
			});
		}

		const now = new Date();
		await this.businessProfileRepo.suspendCollaborator(
			cmd.collaboratorProfileId,
			cmd.userId,
			now,
		);

		if (collaborator.email) {
			this.emailService
				.sendCollaboratorSuspendedEmail(collaborator.email)
				.then(() => {
					this.logger.info(
						{
							event: 'collaborator.suspend.email_sent',
							collaboratorProfileId: cmd.collaboratorProfileId,
						},
						'Collaborator suspension email sent',
					);
					recordApiEvent('collaborator.suspend.email_sent', {
						module: 'members',
						outcome: 'success',
					});
				})
				.catch((err: unknown) => {
					this.logger.warn(
						{
							event: 'collaborator.suspend.email_failed',
							collaboratorProfileId: cmd.collaboratorProfileId,
							error: err instanceof Error ? err.message : String(err),
						},
						'Collaborator suspension email delivery failed — suspension remains active',
					);
					recordApiEvent('collaborator.suspend.email_failed', {
						module: 'members',
						outcome: 'failure',
					});
				});
		}

		this.logger.info(
			{
				event: 'collaborator.suspend.success',
				collaboratorProfileId: cmd.collaboratorProfileId,
				suspendedByUserId: cmd.userId,
			},
			'Collaborator suspended successfully',
		);
		recordApiEvent('collaborator.suspend.success', {
			module: 'members',
			outcome: 'success',
		});

		return {};
	}
}
