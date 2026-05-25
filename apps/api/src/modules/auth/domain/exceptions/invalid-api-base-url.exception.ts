import { DomainException } from '@zoom/utils';

export class InvalidApiBaseUrlException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('AUTH_INVALID_API_BASE_URL', meta);
	}
}
