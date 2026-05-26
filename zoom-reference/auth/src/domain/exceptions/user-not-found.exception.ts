import { DomainException } from '@zoom/utils';

export class UserNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_USER_NOT_FOUND', meta);
	}
}
