import type { Result } from '@zoom/utils';
import type { UserNotFoundException } from '../../../domain/exceptions/user-not-found.exception';
import type { SessionDto } from '../out/session-repository.port';

export interface ListUserSessionsCommand {
	targetUserId: string;
	callerUserId: string;
}

export type ListUserSessionsResult = Result<
	SessionDto[],
	UserNotFoundException
>;

export abstract class ListUserSessionsUseCasePort {
	abstract execute(
		command: ListUserSessionsCommand,
	): Promise<ListUserSessionsResult>;
}
