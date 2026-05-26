import { DomainException } from '@zoom/utils';

export class ParishNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_PARISH_NOT_FOUND', meta);
	}
}
