import { DomainException } from '@zoom/utils';

export class InvitationAtLeastOneServiceRequiredException extends DomainException {
	constructor() {
		super('INVITATIONS_AT_LEAST_ONE_SERVICE_REQUIRED');
	}
}
