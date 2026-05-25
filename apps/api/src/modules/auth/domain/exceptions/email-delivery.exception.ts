import { DomainException } from '@zoom/utils';

export class EmailDeliveryException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_EMAIL_DELIVERY_FAILED', meta);
	}
}
