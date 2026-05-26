import { DomainException } from '@zoom/utils';

export class InvalidPasswordException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_INVALID_PASSWORD', meta);
	}
}
