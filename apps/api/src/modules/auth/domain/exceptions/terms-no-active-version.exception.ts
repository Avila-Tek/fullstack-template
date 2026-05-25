import { DomainException } from '@zoom/utils';

export class TermsNoActiveVersionException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_TERMS_NO_ACTIVE_VERSION', meta);
	}
}
