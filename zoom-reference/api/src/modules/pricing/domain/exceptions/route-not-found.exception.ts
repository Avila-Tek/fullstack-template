import { DomainException } from '@zoom/utils';

export class RouteNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PRICING_ROUTE_NOT_FOUND', meta);
	}
}
