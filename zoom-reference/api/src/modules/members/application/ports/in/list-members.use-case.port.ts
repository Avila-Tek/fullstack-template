import type {
	TCollaboratorListItem,
	TListMembersQuery,
	TPagination,
} from '@zoom/schemas';

export abstract class ListMembersUseCasePort {
	abstract execute(
		requestingUserId: string,
		query: TListMembersQuery,
	): Promise<TPagination<TCollaboratorListItem>>;
}
