import { DomainException } from '@zoom/utils';

export class DocumentTypeNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_DOCUMENT_TYPE_NOT_FOUND', meta);
	}
}
