import { DomainException } from '@zoom/utils';

export class MembersOwnerOnlyException extends DomainException {
	constructor() {
		super('MEMBERS_OWNER_ONLY');
	}
}
