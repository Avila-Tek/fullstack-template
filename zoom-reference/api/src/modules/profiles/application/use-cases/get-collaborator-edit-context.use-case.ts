import { Inject, Injectable } from '@nestjs/common';
import type { TCollaboratorEditContext } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { MemberProfileNotFoundException } from '../../../members/domain/exceptions/member-profile-not-found.exception';
import { MembersOwnerOnlyException } from '../../../members/domain/exceptions/members-owner-only.exception';
import { GetCollaboratorEditContextUseCasePort } from '../ports/in/get-collaborator-edit-context.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { CollaboratorEditContextRepositoryPort } from '../ports/out/collaborator-edit-context-repository.port';

@Injectable()
export class GetCollaboratorEditContextUseCase
	implements GetCollaboratorEditContextUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(CollaboratorEditContextRepositoryPort)
		private readonly contextRepo: CollaboratorEditContextRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		callerUserId: string,
		collaboratorProfileId: string,
	): Promise<TCollaboratorEditContext> {
		const owner = await this.profileRepo.findOwnerByUserId(callerUserId);
		if (!owner) {
			throw new MembersOwnerOnlyException();
		}

		const context = await this.contextRepo.findByIdInAccount(
			collaboratorProfileId,
			owner.businessAccountId,
		);
		if (!context) {
			throw new MemberProfileNotFoundException();
		}

		this.logger.info(
			{
				event: 'collaborator_edit_context_accessed',
				businessAccountId: owner.businessAccountId,
			},
			'Collaborator edit context accessed',
		);

		return context;
	}
}
