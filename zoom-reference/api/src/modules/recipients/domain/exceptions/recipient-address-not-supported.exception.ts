import { DomainException } from '@zoom/utils';

export class RecipientAddressNotSupportedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('RECIPIENTS_ADDRESS_NOT_SUPPORTED', meta);
	}
}
