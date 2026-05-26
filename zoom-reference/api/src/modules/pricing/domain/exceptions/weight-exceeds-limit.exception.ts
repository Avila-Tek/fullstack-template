import { DomainException } from '@zoom/utils';

export class WeightExceedsLimitException extends DomainException {
	constructor(maxWeightKg: number, meta?: Record<string, unknown>) {
		super('PRICING_WEIGHT_EXCEEDS_LIMIT', { ...meta, maxWeightKg });
	}
}
