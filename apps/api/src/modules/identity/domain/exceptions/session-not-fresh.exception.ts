import { DomainException } from '@/shared/domain-utils';

export class SessionNotFreshException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_SESSION_NOT_FRESH', meta);
	}
}
