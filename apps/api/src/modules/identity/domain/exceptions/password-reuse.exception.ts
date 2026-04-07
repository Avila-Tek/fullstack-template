import { DomainException } from '@/shared/domain-utils';

export class PasswordReuseException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_PASSWORD_REUSE', meta);
	}
}
