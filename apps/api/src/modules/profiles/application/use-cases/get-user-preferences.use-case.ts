import { Inject, Injectable } from '@nestjs/common';
import type { TGetPreferencesOutput } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { GetUserPreferencesUseCasePort } from '../ports/in/get-user-preferences.use-case.port';
import {
	BusinessProfileRepositoryPort,
	type UserPreferencesRecord,
} from '../ports/out/business-profile-repository.port';

@Injectable()
export class GetUserPreferencesUseCase
	implements GetUserPreferencesUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(userId: string): Promise<TGetPreferencesOutput> {
		let record: UserPreferencesRecord | null;
		try {
			record = await this.profileRepo.findPreferencesByUserId(userId);
		} catch (err) {
			this.logger.error(
				{ event: 'preferences_load_failed', userId, error: String(err) },
				'Failed to load user preferences',
			);
			throw err;
		}

		if (!record) {
			this.logger.error(
				{
					event: 'preferences_load_failed',
					userId,
					error: 'profile_not_found',
				},
				'No business profile found for user',
			);
			throw new BusinessProfileNotFoundException({ userId });
		}

		this.logger.info(
			{ event: 'preferences_loaded', userId },
			'User preferences loaded successfully',
		);

		return {
			weightUnit: record.weightUnit,
			dimensionUnit: record.dimensionUnit,
		};
	}
}
