import { DomainException } from '@zoom/utils';

export class ReturnOfficeNotFoundException extends DomainException {
	constructor(meta?: Record<string, unknown>) {
		super('PROFILES_RETURN_OFFICE_NOT_FOUND', meta);
	}
}
