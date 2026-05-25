import { DomainException } from '@zoom/utils';

export class BusinessProfileNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BUSINESS_PROFILE_NOT_FOUND', meta);
	}
}
