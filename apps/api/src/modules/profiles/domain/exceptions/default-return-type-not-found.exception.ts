import { DomainException } from '@zoom/utils';

export class DefaultReturnTypeNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_DEFAULT_RETURN_TYPE_NOT_FOUND', meta);
	}
}
