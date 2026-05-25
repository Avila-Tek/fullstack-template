import { DomainException } from '@zoom/utils';

export class SystemInactiveException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_SYSTEM_INACTIVE', meta);
	}
}
