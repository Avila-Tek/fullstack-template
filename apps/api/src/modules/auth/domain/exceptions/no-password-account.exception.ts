import { DomainException } from '@zoom/utils';

export class NoPasswordAccountException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_NO_PASSWORD_ACCOUNT', meta);
	}
}
