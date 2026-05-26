import { DomainException } from '@zoom/utils';

export class InvitationOwnerOnlyException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('INVITATIONS_OWNER_ONLY', meta);
	}
}
