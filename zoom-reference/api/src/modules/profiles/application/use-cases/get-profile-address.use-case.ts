import { Inject, Injectable } from '@nestjs/common';
import type { TGetProfileAddressOutput } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { BillingAddressNotFoundException } from '../../domain/exceptions/billing-address-not-found.exception';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { GetProfileAddressUseCasePort } from '../ports/in/get-profile-address.use-case.port';
import { AddressRepositoryPort } from '../ports/out/address-repository.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';

@Injectable()
export class GetProfileAddressUseCase implements GetProfileAddressUseCasePort {
	constructor(
		private readonly profileRepo: BusinessProfileRepositoryPort,
		private readonly addressRepo: AddressRepositoryPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(userId: string): Promise<TGetProfileAddressOutput> {
		const detail = await this.profileRepo.findProfileDetailByUserId(userId);
		if (detail === null) {
			throw new BusinessProfileNotFoundException({ userId });
		}

		const billingAddressId = detail.billingAddressId;
		if (billingAddressId === null) {
			throw new BillingAddressNotFoundException({
				businessProfileId: detail.id,
			});
		}

		const resolved = await this.addressRepo.findResolvedById(billingAddressId);
		if (resolved === null) {
			throw new BillingAddressNotFoundException({
				businessProfileId: detail.id,
				billingAddressId,
			});
		}

		this.logger.info(
			{
				event: 'profile_address_loaded',
				userId,
				businessProfileId: detail.id,
			},
			'Profile address loaded',
		);

		if (resolved.cityName === null || resolved.stateName === null) {
			throw new BillingAddressNotFoundException({
				businessProfileId: detail.id,
				billingAddressId,
			});
		}

		return {
			addressId: resolved.id,
			cityName: resolved.cityName,
			stateName: resolved.stateName,
			addressLine: resolved.addressLine,
		};
	}
}
