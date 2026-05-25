import { DomainException } from '@zoom/utils';

export class OwnerAlreadyExistsException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_OWNER_ALREADY_EXISTS', meta);
	}
}
