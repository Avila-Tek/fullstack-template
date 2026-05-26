import { DomainException } from '@zoom/utils';

export class ReturnPreferenceNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_PREFERENCE_NOT_FOUND', meta);
	}
}
