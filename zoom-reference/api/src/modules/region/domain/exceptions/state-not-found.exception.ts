import { DomainException } from '@zoom/utils';

export class StateNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('REGION_STATE_NOT_FOUND', meta);
	}
}
