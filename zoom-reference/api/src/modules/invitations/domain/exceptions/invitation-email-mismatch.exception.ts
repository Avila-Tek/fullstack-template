import { DomainException } from '@zoom/utils';

export class InvitationEmailMismatchException extends DomainException {
	constructor(ctx: { inviteId: string }) {
		super('INVITATION_EMAIL_MISMATCH', ctx);
	}
}
