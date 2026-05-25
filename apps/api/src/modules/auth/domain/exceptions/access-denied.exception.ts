import { DomainException } from '@zoom/utils';

export class AccessDeniedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_ACCESS_DENIED', meta);
	}
}
