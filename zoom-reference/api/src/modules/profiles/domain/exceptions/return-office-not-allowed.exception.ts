import { DomainException } from '@zoom/utils';

export class ReturnOfficeNotAllowedException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_OFFICE_NOT_ALLOWED', meta);
	}
}
