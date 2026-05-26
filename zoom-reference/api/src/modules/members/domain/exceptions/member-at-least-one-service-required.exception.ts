import { DomainException } from '@zoom/utils';

export class MemberAtLeastOneServiceRequiredException extends DomainException {
	constructor() {
		super('MEMBERS_AT_LEAST_ONE_SERVICE_REQUIRED');
	}
}
