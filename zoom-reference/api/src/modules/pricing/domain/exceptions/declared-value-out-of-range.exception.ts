import { DomainException } from '@zoom/utils';

export class DeclaredValueOutOfRangeException extends DomainException {
	constructor(min: number, max: number, meta?: Record<string, unknown>) {
		super('PRICING_DECLARED_VALUE_OUT_OF_RANGE', { ...meta, min, max });
	}
}
