import { DomainException } from '@zoom/utils';

export class PostalCodeNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_POSTAL_CODE_NOT_FOUND', meta);
	}
}
