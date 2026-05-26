import { DomainException } from '@zoom/utils';

export class RoleTemplateNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('ROLE_TEMPLATES_NOT_FOUND', meta);
	}
}
