import { DomainException } from '@zoom/utils';

export class InvalidPermissionKeyException extends DomainException {
	constructor(invalidKeys: string[]) {
		super('INVITATIONS_INVALID_PERMISSION_KEY');
		this.invalidKeys = invalidKeys;
	}

	invalidKeys: string[];
}
