import { DomainException } from '@zoom/utils';

export class BusinessAccountForbiddenException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BUSINESS_ACCOUNT_FORBIDDEN', meta);
	}
}
