import { DomainException } from '@zoom/utils';

export class SessionExpiredException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_SESSION_EXPIRED', meta);
	}
}
