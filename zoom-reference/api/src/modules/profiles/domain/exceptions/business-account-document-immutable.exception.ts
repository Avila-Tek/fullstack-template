import { DomainException } from '@zoom/utils';

export class BusinessAccountDocumentImmutableException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_BUSINESS_ACCOUNT_DOCUMENT_IMMUTABLE', meta);
	}
}
