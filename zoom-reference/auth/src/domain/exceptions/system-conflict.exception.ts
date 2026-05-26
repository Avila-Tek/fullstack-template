import { DomainException } from '@zoom/utils';

export class SystemConflictException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_SYSTEM_CONFLICT', meta);
	}
}
