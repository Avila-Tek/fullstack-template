import { DomainException } from '@zoom/utils';

export class AddressCountryIdMissingException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_ADDRESS_COUNTRY_ID_MISSING', meta);
	}
}
