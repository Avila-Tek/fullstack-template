import { DomainException } from '@zoom/utils';

export class DefaultWeightUnitNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_DEFAULT_WEIGHT_UNIT_NOT_FOUND', meta);
	}
}
