import { DomainException } from '@zoom/utils';

export class BillingAddressNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BILLING_ADDRESS_NOT_FOUND', meta);
	}
}
