import { DomainException } from '@zoom/utils';

export class InvitationEmailAlreadyMemberException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('INVITATIONS_EMAIL_ALREADY_MEMBER', meta);
	}
}
