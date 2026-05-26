import { Inject, Injectable } from '@nestjs/common';
import type { TProfileDetailResponse } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import {
	BusinessProfileRepositoryPort,
	type ProfileDetailRecord,
} from '../../../profiles/application/ports/out/business-profile-repository.port';
import { ProfileDetailLoadException } from '../../domain/exceptions/profile-detail-load.exception';
import { ProfileNotFoundException } from '../../domain/exceptions/profile-not-found.exception';
import { ProfileSuspendedException } from '../../domain/exceptions/profile-suspended.exception';
import { ProfileUnexpectedRoleException } from '../../domain/exceptions/profile-unexpected-role.exception';
import { GetProfileDetailUseCasePort } from '../ports/in/get-profile-detail.use-case.port';

@Injectable()
export class GetProfileDetailUseCase implements GetProfileDetailUseCasePort {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(userId: string): Promise<TProfileDetailResponse> {
		let record: ProfileDetailRecord | null;
		try {
			record = await this.businessProfileRepo.findProfileDetailByUserId(userId);
		} catch (err) {
			this.logger.error(
				{
					event: 'profile_load_unexpected_response',
					userId,
					error: String(err),
				},
				'Failed to load profile detail',
			);
			throw new ProfileDetailLoadException({ userId, cause: String(err) });
		}

		if (!record) {
			this.logger.warn(
				{ event: 'profile_not_found', userId },
				'No business profile found for user',
			);
			throw new ProfileNotFoundException({ userId });
		}

		if (record.status === 'suspended') {
			this.logger.warn(
				{ event: 'profile_suspended', userId },
				'Profile is suspended for user',
			);
			throw new ProfileSuspendedException({ userId });
		}

		const profile = {
			firstName: record.firstName,
			lastName: record.lastName,
			legalName: record.legalName,
			email: record.email,
			phoneNumber: record.phoneNumber,
			phonePrefixId: record.phonePrefixId,
			documentTypeId: record.documentTypeId,
			documentNumber: record.documentNumber,
		};

		if (record.role === 'owner') {
			this.logger.info(
				{ event: 'profile_detail_loaded', userId, role: 'owner' },
				'Profile detail loaded successfully',
			);

			return {
				role: 'owner',
				profile,
				address: {
					billingAddressLine1: record.billingAddressLine1,
					billingAddressCountryId: record.billingAddressCountryId,
					billingAddressStateId: record.billingAddressStateId,
					billingAddressCityId: record.billingAddressCityId,
				},
			};
		}

		if (record.role === 'member') {
			this.logger.info(
				{ event: 'profile_detail_loaded', userId, role: 'member' },
				'Profile detail loaded successfully',
			);
			return {
				role: 'member',
				profile,
				address: {
					billingAddressLine1: record.billingAddressLine1,
					billingAddressCountryId: record.billingAddressCountryId,
					billingAddressStateId: record.billingAddressStateId,
					billingAddressCityId: record.billingAddressCityId,
				},
			};
		}

		this.logger.error(
			{
				event: 'profile_load_unexpected_response',
				userId,
				error: 'unexpected_role',
				role: record.role,
			},
			'Profile has an unexpected role value',
		);
		throw new ProfileUnexpectedRoleException({ userId, role: record.role });
	}
}
