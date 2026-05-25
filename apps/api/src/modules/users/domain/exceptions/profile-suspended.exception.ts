import { DomainException } from '@zoom/utils';

export class ProfileSuspendedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('USERS_PROFILE_SUSPENDED', meta);
	}
}
