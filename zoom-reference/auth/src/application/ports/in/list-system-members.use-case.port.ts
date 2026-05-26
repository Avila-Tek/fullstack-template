import type { TPagination, TPaginationInput } from '@zoom/schemas';
import type { Result } from '@zoom/utils';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export interface ListSystemMembersCommand {
	systemId: string;
	pagination: TPaginationInput;
}

export interface MemberDto {
	userId: string;
	email: string;
	role: 'member' | 'admin' | 'owner';
	activated: boolean;
	createdAt: Date;
}

export type ListSystemMembersData = TPagination<MemberDto>;

export type ListSystemMembersResult = Result<
	ListSystemMembersData,
	SystemNotFoundException
>;

export abstract class ListSystemMembersUseCasePort {
	abstract execute(
		command: ListSystemMembersCommand,
	): Promise<ListSystemMembersResult>;
}
