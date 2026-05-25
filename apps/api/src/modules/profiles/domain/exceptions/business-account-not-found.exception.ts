import { DomainException } from '@zoom/utils';

export class BusinessAccountNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BUSINESS_ACCOUNT_NOT_FOUND', meta);
	}
}
