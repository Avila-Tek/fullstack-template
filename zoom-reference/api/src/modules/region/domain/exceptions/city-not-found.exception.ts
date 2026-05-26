import { DomainException } from '@zoom/utils';

export class CityNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_CITY_NOT_FOUND', meta);
	}
}
