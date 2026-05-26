import { DomainException } from '@zoom/utils';

export class LockerInvalidException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PRICING_LOCKER_INVALID', meta);
	}
}
