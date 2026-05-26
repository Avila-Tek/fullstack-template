import { DomainException } from '@zoom/utils';

export class BcvRateMissingException extends DomainException {
	constructor() {
		super('PRICING_BCV_RATE_MISSING');
	}
}
