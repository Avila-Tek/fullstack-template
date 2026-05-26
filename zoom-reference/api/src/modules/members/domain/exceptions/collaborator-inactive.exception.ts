import { DomainException } from '@zoom/utils';

export class CollaboratorInactiveException extends DomainException {
	constructor() {
		super('MEMBERS_COLLABORATOR_INACTIVE');
	}
}
