import { DomainException } from '@/shared/domain-utils';

export class NoPasswordAccountException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('IDENTITY_NO_PASSWORD_ACCOUNT', meta);
	}
}
