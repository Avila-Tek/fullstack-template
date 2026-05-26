import { DomainException } from '@zoom/utils';

export class CityLegacyIdMissingException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_CITY_LEGACY_ID_MISSING', meta);
	}
}
