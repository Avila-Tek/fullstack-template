import { DomainException } from '@zoom/utils';

export class MembersInvalidStatusException extends DomainException {
	constructor(ctx?: { collaboratorProfileId?: string; status?: string }) {
		super('MEMBERS_INVALID_STATUS', ctx);
	}
}
