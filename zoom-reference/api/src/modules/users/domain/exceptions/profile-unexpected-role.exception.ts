import { DomainException } from '@zoom/utils';

export class ProfileUnexpectedRoleException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('USERS_PROFILE_UNEXPECTED_ROLE', meta);
	}
}
