import { DomainException } from '@zoom/utils';

export class CannotRemoveOwnerException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_CANNOT_REMOVE_OWNER', meta);
	}
}
