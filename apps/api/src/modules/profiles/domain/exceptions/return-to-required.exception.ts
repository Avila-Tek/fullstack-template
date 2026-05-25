import { DomainException } from '@zoom/utils';

export class ReturnToRequiredException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_TO_REQUIRED', meta);
	}
}
