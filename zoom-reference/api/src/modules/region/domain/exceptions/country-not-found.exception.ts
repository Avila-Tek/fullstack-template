import { DomainException } from '@zoom/utils';

export class CountryNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_COUNTRY_NOT_FOUND', meta);
	}
}
