import { DomainException } from '@zoom/utils';

export class InvalidCredentialsException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_INVALID_CREDENTIALS', meta);
	}
}
