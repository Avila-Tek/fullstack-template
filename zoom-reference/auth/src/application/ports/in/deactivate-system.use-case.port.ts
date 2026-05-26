import type { Result } from '@zoom/utils';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export interface DeactivateSystemCommand {
	systemId: string;
	platformAdminUserId: string;
	ipAddress: string;
	userAgent: string;
}

export type DeactivateSystemResult = Result<null, SystemNotFoundException>;

export abstract class DeactivateSystemUseCasePort {
	abstract execute(
		command: DeactivateSystemCommand,
	): Promise<DeactivateSystemResult>;
}
