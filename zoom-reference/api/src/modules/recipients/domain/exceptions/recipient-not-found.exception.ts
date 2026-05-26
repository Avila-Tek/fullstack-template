import { DomainException } from '@zoom/utils';

export class RecipientNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_NOT_FOUND', meta);
	}
}
