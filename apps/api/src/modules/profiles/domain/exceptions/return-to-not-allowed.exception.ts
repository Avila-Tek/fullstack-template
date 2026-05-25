import { DomainException } from '@zoom/utils';

export class ReturnToNotAllowedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_TO_NOT_ALLOWED', meta);
	}
}
