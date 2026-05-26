import { DomainException } from '@zoom/utils';

export class MunicipalityNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_MUNICIPALITY_NOT_FOUND', meta);
	}
}
