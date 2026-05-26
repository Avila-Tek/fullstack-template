import { DomainException } from '@zoom/utils';

export class InvalidUnitOfMeasureException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_INVALID_UNIT_OF_MEASURE', meta);
	}
}
