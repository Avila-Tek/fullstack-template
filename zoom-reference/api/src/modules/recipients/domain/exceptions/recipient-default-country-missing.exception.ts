import { DomainException } from '@zoom/utils';

export class RecipientDefaultCountryMissingException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_DEFAULT_COUNTRY_MISSING', meta);
	}
}
