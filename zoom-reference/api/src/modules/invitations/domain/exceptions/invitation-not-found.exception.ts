import { DomainException } from '@zoom/utils';

export class InvitationNotFoundOrForbiddenException extends DomainException {
	constructor(ctx: { inviteId: string }) {
		super('INVITATION_NOT_FOUND', ctx);
	}
}
