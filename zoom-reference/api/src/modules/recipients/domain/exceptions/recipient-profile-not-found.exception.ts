import { DomainException } from '@zoom/utils';

export class RecipientProfileNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_PROFILE_NOT_FOUND', meta);
	}
}
