import { DomainException } from '@zoom/utils';

export class NotSystemAdminException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_NOT_SYSTEM_ADMIN', meta);
	}
}
