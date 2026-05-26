import { DomainException } from '@zoom/utils';

export class InvitationNotPendingException extends DomainException {
	constructor(ctx: { inviteId: string }) {
		super('INVITATION_NOT_PENDING', ctx);
	}
}
