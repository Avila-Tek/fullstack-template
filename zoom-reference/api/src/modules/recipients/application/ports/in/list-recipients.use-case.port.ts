import type {
	TListRecipientsQuery,
	TListRecipientsResponse,
} from '@zoom/schemas';

export interface ListRecipientsCommand {
	userId: string;
	query: TListRecipientsQuery;
	permissions: {
		hasShareGuide: boolean;
		hasShareLocker: boolean;
	};
}

export abstract class ListRecipientsUseCasePort {
	abstract execute(
		cmd: ListRecipientsCommand,
	): Promise<TListRecipientsResponse>;
}
