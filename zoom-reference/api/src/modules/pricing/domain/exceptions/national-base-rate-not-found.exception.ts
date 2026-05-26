import { DomainException } from '@zoom/utils';

export class NationalBaseRateNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PRICING_BASE_RATE_NOT_FOUND', meta);
	}
}
