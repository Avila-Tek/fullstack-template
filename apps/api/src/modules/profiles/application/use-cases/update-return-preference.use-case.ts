import { Inject, Injectable } from '@nestjs/common';
import type {
	TGetReturnDataOutput,
	TUpdateReturnDataInput,
} from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import {
	LEGACY_ID_DESTRUIR,
	LEGACY_ID_DEVOLVER,
} from '../../domain/constants/return-type-legacy-ids';
import { BillingAddressNotFoundException } from '../../domain/exceptions/billing-address-not-found.exception';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { ReturnOfficeNotAllowedException } from '../../domain/exceptions/return-office-not-allowed.exception';
import { ReturnOfficeNotFoundException } from '../../domain/exceptions/return-office-not-found.exception';
import { ReturnOfficeRequiredException } from '../../domain/exceptions/return-office-required.exception';
import { ReturnPreferenceNotFoundException } from '../../domain/exceptions/return-preference-not-found.exception';
import { ReturnToNotAllowedException } from '../../domain/exceptions/return-to-not-allowed.exception';
import { ReturnToRequiredException } from '../../domain/exceptions/return-to-required.exception';
import { ReturnTypeNotFoundException } from '../../domain/exceptions/return-type-not-found.exception';
import { ReturnTypeNotSupportedException } from '../../domain/exceptions/return-type-not-supported.exception';
import { mapReturnPreferenceToOutput } from '../mappers/map-return-preference-to-output';
import { UpdateReturnPreferenceUseCasePort } from '../ports/in/update-return-preference.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { BusinessProfileReturnPreferenceRepositoryPort } from '../ports/out/business-profile-return-preference-repository.port';
import { OfficeMasterRepositoryPort } from '../ports/out/office-master-repository.port';
import { ReturnTypeMasterRepositoryPort } from '../ports/out/return-type-master-repository.port';

@Injectable()
export class UpdateReturnPreferenceUseCase
	implements UpdateReturnPreferenceUseCasePort
{
	constructor(
		private readonly profileRepo: BusinessProfileRepositoryPort,
		private readonly returnPrefRepo: BusinessProfileReturnPreferenceRepositoryPort,
		private readonly returnTypeRepo: ReturnTypeMasterRepositoryPort,
		private readonly officeRepo: OfficeMasterRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		userId: string,
		input: TUpdateReturnDataInput,
	): Promise<TGetReturnDataOutput> {
		const [detail, returnType] = await Promise.all([
			this.profileRepo.findProfileDetailByUserId(userId),
			this.returnTypeRepo.findActiveById(input.returnTypeId),
		]);
		if (detail === null) {
			throw new BusinessProfileNotFoundException({ userId });
		}
		if (returnType === null) {
			throw new ReturnTypeNotFoundException({
				returnTypeId: input.returnTypeId,
			});
		}

		const isDestruir = returnType.legacyId === LEGACY_ID_DESTRUIR;
		const isDevolver = returnType.legacyId === LEGACY_ID_DEVOLVER;
		if (!isDestruir && !isDevolver) {
			throw new ReturnTypeNotSupportedException({
				returnTypeId: input.returnTypeId,
				legacyId: returnType.legacyId,
			});
		}
		let returnTo: 'address' | 'office' | null = null;
		let returnAddressId: string | null = null;
		let returnOfficeId: string | null = null;

		if (isDestruir) {
			if (input.returnTo != null) {
				throw new ReturnToNotAllowedException({
					returnTypeId: input.returnTypeId,
				});
			}
			if (input.returnOfficeId != null) {
				throw new ReturnOfficeNotAllowedException({
					returnTypeId: input.returnTypeId,
				});
			}
		} else {
			if (input.returnTo == null) {
				throw new ReturnToRequiredException({
					returnTypeId: input.returnTypeId,
				});
			}
			returnTo = input.returnTo;

			if (returnTo === 'address') {
				if (input.returnOfficeId != null) {
					throw new ReturnOfficeNotAllowedException();
				}
				const billingAddressId = detail.billingAddressId;
				if (billingAddressId === null) {
					throw new BillingAddressNotFoundException({
						businessProfileId: detail.id,
					});
				}
				returnAddressId = billingAddressId;
			} else {
				if (input.returnOfficeId == null) {
					throw new ReturnOfficeRequiredException();
				}
				const office = await this.officeRepo.findActiveById(
					input.returnOfficeId,
				);
				if (office === null) {
					throw new ReturnOfficeNotFoundException({
						returnOfficeId: input.returnOfficeId,
					});
				}
				returnOfficeId = input.returnOfficeId;
			}
		}

		await this.returnPrefRepo.updateByBusinessProfileId(detail.id, {
			returnTypeId: input.returnTypeId,
			returnTo,
			returnAddressId,
			returnOfficeId,
		});

		const updated = await this.returnPrefRepo.findByBusinessProfileId(
			detail.id,
		);
		if (updated === null) {
			throw new ReturnPreferenceNotFoundException({
				businessProfileId: detail.id,
			});
		}

		this.logger.info(
			{
				event: 'return_data_saved',
				userId,
				businessProfileId: detail.id,
				returnTypeLegacyId: returnType.legacyId,
				returnTo,
				returnOfficeId,
			},
			'Return data saved',
		);
		recordApiEvent('return_data_saved', {
			module: 'profiles',
			outcome: 'success',
		});

		return mapReturnPreferenceToOutput(updated);
	}
}
