import { DomainException } from '@zoom/utils';

export class NotPlatformAdminException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_NOT_PLATFORM_ADMIN', meta);
	}
}
