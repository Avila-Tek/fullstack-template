import type { Result } from '@zoom/utils';
import type {
	System,
	SystemAccessModel,
} from '../../../domain/entities/system.entity';
import type { InvalidApiBaseUrlException } from '../../../domain/exceptions/invalid-api-base-url.exception';
import type { SystemConflictException } from '../../../domain/exceptions/system-conflict.exception';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export interface UpdateSystemCommand {
	systemId: string;
	platformAdminUserId: string;
	name?: string;
	slug?: string;
	apiBaseUrl?: string;
	accessModel?: SystemAccessModel;
	ipAddress: string;
	userAgent: string;
}

export type UpdateSystemResult = Result<
	System,
	SystemNotFoundException | SystemConflictException | InvalidApiBaseUrlException
>;

export abstract class UpdateSystemUseCasePort {
	abstract execute(command: UpdateSystemCommand): Promise<UpdateSystemResult>;
}
