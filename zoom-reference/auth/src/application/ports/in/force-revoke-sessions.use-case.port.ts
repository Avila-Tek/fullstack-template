import type { Result } from '@zoom/utils';
import type { UserNotFoundException } from '../../../domain/exceptions/user-not-found.exception';

export interface ForceRevokeSessionsCommand {
	targetUserId: string;
	platformAdminUserId: string;
	reason?: string;
	ipAddress: string;
	userAgent: string;
}

export interface ForceRevokeSessionsData {
	userId: string;
	sessionsRevokedCount: number;
	sessionInvalidBeforeUpdated: true;
	twoFactorForced: boolean;
}

export type ForceRevokeSessionsResult = Result<
	ForceRevokeSessionsData,
	UserNotFoundException
>;

export abstract class ForceRevokeSessionsUseCasePort {
	abstract execute(
		command: ForceRevokeSessionsCommand,
	): Promise<ForceRevokeSessionsResult>;
}
