import { DomainException } from '@/shared/domain-utils';

export class InvalidEmailException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_INVALID_EMAIL', meta);
	}
}
