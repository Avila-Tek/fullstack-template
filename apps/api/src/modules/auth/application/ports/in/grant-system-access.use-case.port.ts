import type { Result } from '@zoom/utils';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export interface GrantSystemAccessCommand {
	systemId: string;
	callerUserId: string;
	email: string;
	role?: 'member' | 'admin';
	ipAddress: string;
	userAgent: string;
}

export type GrantSystemAccessPath = 'existing' | 'provisioned';

export interface GrantSystemAccessData {
	path: GrantSystemAccessPath;
	alreadyMember?: true;
	userId: string;
	// 'owner' only appears on idempotent returns — it is never assignable via this endpoint (IMPL-06)
	role: 'member' | 'admin' | 'owner';
	profileId: string;
}

export type GrantSystemAccessResult = Result<
	GrantSystemAccessData,
	SystemNotFoundException
>;

export abstract class GrantSystemAccessUseCasePort {
	abstract execute(
		command: GrantSystemAccessCommand,
	): Promise<GrantSystemAccessResult>;
}
