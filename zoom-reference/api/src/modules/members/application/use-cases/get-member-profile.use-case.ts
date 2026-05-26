import { Inject, Injectable } from '@nestjs/common';
import type { TMemberProfileDetail } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { BusinessProfileRepositoryPort } from '../../../profiles/application/ports/out/business-profile-repository.port';
import { MemberProfileNotFoundException } from '../../domain/exceptions/member-profile-not-found.exception';
import { MembersOwnerOnlyException } from '../../domain/exceptions/members-owner-only.exception';
import { GetMemberProfileUseCasePort } from '../ports/in/get-member-profile.use-case.port';
import { MemberProfileRepositoryPort } from '../ports/out/member-profile-repository.port';

@Injectable()
export class GetMemberProfileUseCase extends GetMemberProfileUseCasePort {
	constructor(
		@Inject(MemberProfileRepositoryPort)
		private readonly memberProfileRepo: MemberProfileRepositoryPort,
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {
		super();
	}

	async execute(
		requestingUserId: string,
		profileId: string,
	): Promise<TMemberProfileDetail> {
		const ownership =
			await this.profileRepo.findOwnerByUserId(requestingUserId);
		if (!ownership) throw new MembersOwnerOnlyException();

		const { businessAccountId } = ownership;

		const record = await this.memberProfileRepo.findByIdInAccount(
			profileId,
			businessAccountId,
		);
		if (!record) throw new MemberProfileNotFoundException();

		this.logger.info(
			{
				event: 'member_profile_accessed',
				adminUserId: requestingUserId,
				businessAccountId,
				profileId,
				profileStatus: record.status,
			},
			'Member profile accessed',
		);

		return record;
	}
}
