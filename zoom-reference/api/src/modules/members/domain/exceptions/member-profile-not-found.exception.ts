import { DomainException } from '@zoom/utils';

export class MemberProfileNotFoundException extends DomainException {
	constructor() {
		super('MEMBERS_PROFILE_NOT_FOUND');
	}
}
