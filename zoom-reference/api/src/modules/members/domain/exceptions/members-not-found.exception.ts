import { DomainException } from '@zoom/utils';

export class MembersNotFoundException extends DomainException {
	constructor(ctx?: { collaboratorProfileId?: string }) {
		super('MEMBERS_NOT_FOUND', ctx);
	}
}
