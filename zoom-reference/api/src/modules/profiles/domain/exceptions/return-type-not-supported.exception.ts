import { DomainException } from '@zoom/utils';

export class ReturnTypeNotSupportedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_TYPE_NOT_SUPPORTED', meta);
	}
}
