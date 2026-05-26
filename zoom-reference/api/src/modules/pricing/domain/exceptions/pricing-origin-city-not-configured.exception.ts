import { DomainException } from '@zoom/utils';

export class PricingOriginCityNotConfiguredException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PRICING_ORIGIN_CITY_NOT_CONFIGURED', meta);
	}
}
