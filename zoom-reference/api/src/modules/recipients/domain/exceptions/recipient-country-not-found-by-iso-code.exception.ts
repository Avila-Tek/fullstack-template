import { DomainException } from '@zoom/utils';

export class RecipientCountryNotFoundByIsoCodeException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_COUNTRY_NOT_FOUND_BY_ISO_CODE', meta);
	}
}
