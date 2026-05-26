import { DomainException } from '@zoom/utils';

export class PhonePrefixNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_PHONE_PREFIX_NOT_FOUND', meta);
	}
}
