import { DomainException } from '@zoom/utils';

export class AccountDataInconsistentException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('USERS_ACCOUNT_DATA_INCONSISTENT', meta);
	}
}
