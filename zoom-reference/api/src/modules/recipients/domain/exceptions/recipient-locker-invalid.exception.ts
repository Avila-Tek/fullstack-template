import { DomainException } from '@zoom/utils';

export class RecipientLockerInvalidException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_LOCKER_INVALID', meta);
	}
}
