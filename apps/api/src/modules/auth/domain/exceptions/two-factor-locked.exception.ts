import { DomainException } from '@zoom/utils';

export class TwoFactorLockedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_2FA_LOCKED', meta);
	}
}
