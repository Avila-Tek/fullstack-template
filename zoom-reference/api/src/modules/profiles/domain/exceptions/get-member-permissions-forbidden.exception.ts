import { DomainException } from '@zoom/utils';

export class GetMemberPermissionsForbiddenException extends DomainException {
	constructor() {
		super('PROFILES_GET_MEMBER_PERMISSIONS_FORBIDDEN');
	}
}
