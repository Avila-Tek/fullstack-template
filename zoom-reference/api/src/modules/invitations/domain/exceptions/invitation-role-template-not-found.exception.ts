import { DomainException } from '@zoom/utils';

export class InvitationRoleTemplateNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('INVITATIONS_ROLE_TEMPLATE_NOT_FOUND', meta);
	}
}
