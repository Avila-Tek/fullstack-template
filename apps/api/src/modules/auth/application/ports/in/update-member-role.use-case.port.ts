import type { Result } from '@zoom/utils';
import type { CannotRemoveOwnerException } from '../../../domain/exceptions/cannot-remove-owner.exception';
import type { MemberNotFoundException } from '../../../domain/exceptions/member-not-found.exception';

export interface UpdateMemberRoleCommand {
	systemId: string;
	organizationId: string;
	callerUserId: string;
	targetUserId: string;
	role: 'member' | 'admin';
	ipAddress: string;
	userAgent: string;
	headers: Headers;
}

export type UpdateMemberRoleResult = Result<
	void,
	MemberNotFoundException | CannotRemoveOwnerException
>;

export abstract class UpdateMemberRoleUseCasePort {
	abstract execute(
		command: UpdateMemberRoleCommand,
	): Promise<UpdateMemberRoleResult>;
}
