import { DomainException } from '@zoom/utils';

export class ReturnTypeNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_TYPE_NOT_FOUND', meta);
	}
}
