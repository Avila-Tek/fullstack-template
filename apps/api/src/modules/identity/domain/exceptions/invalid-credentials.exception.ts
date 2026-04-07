import { DomainException } from '@/shared/domain-utils';

export class InvalidCredentialsException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_INVALID_CREDENTIALS', meta);
	}
}
