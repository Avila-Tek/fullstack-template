import { DomainException } from '@zoom/utils';

export class SmsDeliveryException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_2FA_SMS_DELIVERY_FAILED', meta);
	}
}
