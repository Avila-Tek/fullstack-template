import type { TCollaboratorListItem, TListMembersQuery } from '@zoom/schemas';

export interface MemberListPage {
	items: TCollaboratorListItem[];
	total: number;
}

export abstract class MemberListRepositoryPort {
	abstract findPage(
		businessAccountId: string,
		query: TListMembersQuery,
	): Promise<MemberListPage>;
}
