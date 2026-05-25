import { DomainException } from '@zoom/utils';

export class SystemNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_SYSTEM_NOT_FOUND', meta);
	}
}
