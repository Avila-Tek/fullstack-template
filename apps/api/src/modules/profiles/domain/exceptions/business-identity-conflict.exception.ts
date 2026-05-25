import { DomainException } from '@zoom/utils';

export class BusinessIdentityConflictException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BUSINESS_IDENTITY_CONFLICT', meta);
	}
}
