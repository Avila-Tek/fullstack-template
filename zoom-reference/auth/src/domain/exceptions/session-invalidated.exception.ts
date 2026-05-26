import { DomainException } from '@zoom/utils';

export class SessionInvalidatedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_SESSION_INVALIDATED', meta);
	}
}
