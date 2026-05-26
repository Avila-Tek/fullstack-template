import { DomainException } from '@zoom/utils';

export class InvitationDuplicatePendingException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('INVITATIONS_DUPLICATE_PENDING', meta);
	}
}
