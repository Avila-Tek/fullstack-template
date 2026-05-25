import { DomainException } from '@zoom/utils';

export class ProfileDetailLoadException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('USERS_PROFILE_DETAIL_LOAD_ERROR', meta);
	}
}
