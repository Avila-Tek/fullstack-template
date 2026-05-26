import { DomainException } from '@zoom/utils';

export class ReturnOfficeRequiredException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_OFFICE_REQUIRED', meta);
	}
}
