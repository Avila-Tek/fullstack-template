import { DomainException } from '@zoom/utils';

export class PasswordReuseException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_PASSWORD_REUSE', meta);
	}
}
