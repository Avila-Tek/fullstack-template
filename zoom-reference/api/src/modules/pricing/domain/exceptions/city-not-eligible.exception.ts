import { DomainException } from '@zoom/utils';

export type CityNotEligibleSubCode =
	| 'PRICING_HOME_DELIVERY_NOT_AVAILABLE'
	| 'PRICING_COD_NOT_AVAILABLE';

export class CityNotEligibleException extends DomainException {
	constructor(subCode: CityNotEligibleSubCode, meta?: Record<string, unknown>) {
		super(subCode, meta);
	}
}
