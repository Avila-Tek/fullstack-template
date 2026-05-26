import { DomainException } from '@zoom/utils';

export class PricingCalculationFailedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PRICING_CALCULATION_FAILED', meta);
	}
}
