import { DomainException } from '@zoom/utils';

export class DefaultDimensionUnitNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_DEFAULT_DIMENSION_UNIT_NOT_FOUND', meta);
	}
}
