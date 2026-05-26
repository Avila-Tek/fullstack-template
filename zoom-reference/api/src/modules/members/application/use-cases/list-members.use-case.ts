import { Inject, Injectable } from '@nestjs/common';
import type {
	TCollaboratorListItem,
	TListMembersQuery,
	TPagination,
} from '@zoom/schemas';
import { buildPagination } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { MembersOwnerOnlyException } from '../../domain/exceptions/members-owner-only.exception';
import { ListMembersUseCasePort } from '../ports/in/list-members.use-case.port';
import { MemberListRepositoryPort } from '../ports/out/member-list-repository.port';

@Injectable()
export class ListMembersUseCase extends ListMembersUseCasePort {
	constructor(
		@Inject(MemberListRepositoryPort)
		private readonly memberListRepo: MemberListRepositoryPort,
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {
		super();
	}

	async execute(
		requestingUserId: string,
		query: TListMembersQuery,
	): Promise<TPagination<TCollaboratorListItem>> {
		const ownership =
			await this.profileRepo.findOwnerByUserId(requestingUserId);
		if (!ownership) throw new MembersOwnerOnlyException();

		const businessAccountId = ownership.businessAccountId;

		const { items, total } = await this.memberListRepo.findPage(
			businessAccountId,
			query,
		);

		this.logger.info(
			{
				event: 'collaborator_list_accessed',
				adminUserId: requestingUserId,
				businessAccountId,
				page: query.page,
				limit: query.limit,
				filterStatus: query.status ?? null,
				total,
			},
			'Collaborator list accessed',
		);

		return buildPagination(items, total, {
			page: query.page,
			perPage: query.limit,
		});
	}
}
