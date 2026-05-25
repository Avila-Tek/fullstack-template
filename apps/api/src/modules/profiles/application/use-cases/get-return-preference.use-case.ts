import { Inject, Injectable } from '@nestjs/common';
import type { TGetReturnDataOutput } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { ReturnPreferenceNotFoundException } from '../../domain/exceptions/return-preference-not-found.exception';
import { mapReturnPreferenceToOutput } from '../mappers/map-return-preference-to-output';
import { GetReturnPreferenceUseCasePort } from '../ports/in/get-return-preference.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { BusinessProfileReturnPreferenceRepositoryPort } from '../ports/out/business-profile-return-preference-repository.port';

@Injectable()
export class GetReturnPreferenceUseCase
	implements GetReturnPreferenceUseCasePort
{
	constructor(
		private readonly profileRepo: BusinessProfileRepositoryPort,
		private readonly returnPrefRepo: BusinessProfileReturnPreferenceRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(userId: string): Promise<TGetReturnDataOutput> {
		const detail = await this.profileRepo.findProfileDetailByUserId(userId);
		if (detail === null) {
			throw new BusinessProfileNotFoundException({ userId });
		}

		const pref = await this.returnPrefRepo.findByBusinessProfileId(detail.id);
		if (pref === null) {
			throw new ReturnPreferenceNotFoundException({
				businessProfileId: detail.id,
			});
		}

		this.logger.info(
			{
				event: 'return_data_loaded',
				userId,
				businessProfileId: detail.id,
				returnTypeLegacyId: pref.returnTypeLegacyId,
				returnTo: pref.returnTo,
			},
			'Return data loaded',
		);

		return mapReturnPreferenceToOutput(pref);
	}
}
