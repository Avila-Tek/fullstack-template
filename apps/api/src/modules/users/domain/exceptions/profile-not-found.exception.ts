import { DomainException } from '@zoom/utils';

export class ProfileNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('USERS_PROFILE_NOT_FOUND', meta);
	}
}
