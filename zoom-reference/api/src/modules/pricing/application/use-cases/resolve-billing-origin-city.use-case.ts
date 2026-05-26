import { Injectable } from '@nestjs/common';
import { PricingOriginCityNotConfiguredException } from '../../domain/exceptions/pricing-origin-city-not-configured.exception';
import { ResolveBillingOriginCityUseCasePort } from '../ports/in/resolve-billing-origin-city.use-case.port';
import { BusinessProfileBillingCityReaderPort } from '../ports/out/business-profile-billing-city-reader.port';

@Injectable()
export class ResolveBillingOriginCityUseCase
	implements ResolveBillingOriginCityUseCasePort
{
	constructor(
		private readonly billingCityReader: BusinessProfileBillingCityReaderPort,
	) {}

	async execute(args: { userId: string }): Promise<string> {
		const originCityId = await this.billingCityReader.resolveBillingCityId(
			args.userId,
		);
		if (!originCityId) {
			throw new PricingOriginCityNotConfiguredException({
				userId: args.userId,
			});
		}
		return originCityId;
	}
}
