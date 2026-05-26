import { Inject, Injectable } from '@nestjs/common';
import type {
	TGetPreferencesOutput,
	TUpdatePreferencesInput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { InvalidUnitOfMeasureException } from '../../domain/exceptions/invalid-unit-of-measure.exception';
import { UpdateUserPreferencesUseCasePort } from '../ports/in/update-user-preferences.use-case.port';
import type { UpdatePreferencesData } from '../ports/out/business-profile-repository.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import {
	UNIT_TYPE_CODE_DIMENSION,
	UNIT_TYPE_CODE_WEIGHT,
	UnitOfMeasureMasterRepositoryPort,
} from '../ports/out/unit-of-measure-master-repository.port';

@Injectable()
export class UpdateUserPreferencesUseCase
	implements UpdateUserPreferencesUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		private readonly unitRepo: UnitOfMeasureMasterRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		userId: string,
		input: TUpdatePreferencesInput,
	): Promise<TGetPreferencesOutput> {
		const updateData: UpdatePreferencesData = {};
		const updatedFields: string[] = [];

		const [weightUnit, dimensionUnit] = await Promise.all([
			input.weightUnitId
				? this.unitRepo.findActiveById(input.weightUnitId)
				: Promise.resolve(null),
			input.dimensionUnitId
				? this.unitRepo.findActiveById(input.dimensionUnitId)
				: Promise.resolve(null),
		]);

		if (input.weightUnitId) {
			if (!weightUnit || weightUnit.unitTypeCode !== UNIT_TYPE_CODE_WEIGHT) {
				this.logger.warn(
					{
						event: 'preferences_update_failed',
						userId,
						reason: 'invalid_weight_unit',
						unitId: input.weightUnitId,
					},
					'Invalid weight unit ID provided',
				);
				recordApiEvent('preferences_update_failed', {
					module: 'profiles',
					outcome: 'failure',
					error_code: 'invalid_weight_unit',
				});
				throw new InvalidUnitOfMeasureException({
					unitId: input.weightUnitId,
					expectedType: 'weight',
				});
			}
			updateData.internationalMaritimeWeightUnitId = input.weightUnitId;
			updatedFields.push('weightUnit');
		}

		if (input.dimensionUnitId) {
			if (
				!dimensionUnit ||
				dimensionUnit.unitTypeCode !== UNIT_TYPE_CODE_DIMENSION
			) {
				this.logger.warn(
					{
						event: 'preferences_update_failed',
						userId,
						reason: 'invalid_dimension_unit',
						unitId: input.dimensionUnitId,
					},
					'Invalid dimension unit ID provided',
				);
				recordApiEvent('preferences_update_failed', {
					module: 'profiles',
					outcome: 'failure',
					error_code: 'invalid_dimension_unit',
				});
				throw new InvalidUnitOfMeasureException({
					unitId: input.dimensionUnitId,
					expectedType: 'dimension',
				});
			}
			updateData.internationalMaritimeDimensionUnitId = input.dimensionUnitId;
			updatedFields.push('dimensionUnit');
		}

		try {
			await this.profileRepo.updatePreferencesByUserId(userId, updateData);
		} catch (err) {
			this.logger.error(
				{ event: 'preferences_update_failed', userId, error: String(err) },
				'Failed to update user preferences',
			);
			recordApiEvent('preferences_update_failed', {
				module: 'profiles',
				outcome: 'failure',
				error_code: 'repo_error',
			});
			throw err;
		}

		const refreshed = await this.profileRepo.findPreferencesByUserId(userId);
		if (!refreshed) {
			this.logger.error(
				{
					event: 'preferences_update_failed',
					userId,
					error: 'profile_not_found',
				},
				'No business profile found after update',
			);
			recordApiEvent('preferences_update_failed', {
				module: 'profiles',
				outcome: 'failure',
				error_code: 'profile_not_found',
			});
			throw new BusinessProfileNotFoundException({ userId });
		}

		this.logger.info(
			{ event: 'preferences_updated', userId, updatedFields },
			'User preferences updated successfully',
		);
		recordApiEvent('preferences_updated', {
			module: 'profiles',
			outcome: 'success',
		});

		return {
			weightUnit: refreshed.weightUnit,
			dimensionUnit: refreshed.dimensionUnit,
		};
	}
}
