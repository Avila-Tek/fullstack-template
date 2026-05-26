import type { Result } from '@zoom/utils';
import type { CannotRemoveOwnerException } from '../../../domain/exceptions/cannot-remove-owner.exception';
import type { MemberNotFoundException } from '../../../domain/exceptions/member-not-found.exception';

export interface RevokeSystemAccessCommand {
	systemId: string;
	organizationId: string;
	callerUserId: string;
	targetUserId: string;
	ipAddress: string;
	userAgent: string;
	headers: Headers;
}

export type RevokeSystemAccessResult = Result<
	void,
	MemberNotFoundException | CannotRemoveOwnerException
>;

export abstract class RevokeSystemAccessUseCasePort {
	abstract execute(
		command: RevokeSystemAccessCommand,
	): Promise<RevokeSystemAccessResult>;
}
