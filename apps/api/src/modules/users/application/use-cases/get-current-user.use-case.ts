import { Inject, Injectable } from '@nestjs/common';
import type { TCurrentUserResponse } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import {
	BusinessProfileRepositoryPort,
	type CurrentUserRecord,
} from '../../../profiles/application/ports/out/business-profile-repository.port';
import { AccountDataInconsistentException } from '../../domain/exceptions/account-data-inconsistent.exception';
import { ProfileNotFoundException } from '../../domain/exceptions/profile-not-found.exception';
import { GetCurrentUserUseCasePort } from '../ports/in/get-current-user.use-case.port';

@Injectable()
export class GetCurrentUserUseCase implements GetCurrentUserUseCasePort {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(userId: string): Promise<TCurrentUserResponse> {
		let record: CurrentUserRecord | null;
		try {
			record = await this.businessProfileRepo.findCurrentUserByUserId(userId);
		} catch (err) {
			this.logger.error(
				{ event: 'current_user_load_failed', userId, error: String(err) },
				'Failed to load current user',
			);
			throw new AccountDataInconsistentException({
				userId,
				sourceError: String(err),
			});
		}

		if (!record) {
			this.logger.error(
				{
					event: 'current_user_load_failed',
					userId,
					error: 'profile_not_found',
				},
				'No business profile found for user',
			);
			throw new ProfileNotFoundException({ userId });
		}

		const clientCodeLastFour = record.clientCodeLastFour || '****';

		this.logger.info(
			{ event: 'current_user_loaded', userId },
			'Current user loaded successfully',
		);

		return {
			legalName: record.legalName,
			businessProfileId: record.businessProfileId,
			email: record.email,
			clientCodeLastFour,
			coreClientStatus: record.coreClientStatus,
		};
	}
}
