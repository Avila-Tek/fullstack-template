import { DomainException } from '@zoom/utils';

export class MemberNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_MEMBER_NOT_FOUND', meta);
	}
}
