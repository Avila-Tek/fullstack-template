import { DomainException } from '@/shared/domain-utils';

export class InvalidPasswordException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_INVALID_PASSWORD', meta);
	}
}
