import type { Result } from '@zoom/utils';
import type { SystemAccessModel } from '../../../domain/entities/system.entity';
import type { InvalidApiBaseUrlException } from '../../../domain/exceptions/invalid-api-base-url.exception';
import type { SystemConflictException } from '../../../domain/exceptions/system-conflict.exception';

export interface RegisterSystemCommand {
	/** ID of the platform admin performing the operation — from session. */
	platformAdminUserId: string;
	name: string;
	slug: string;
	apiBaseUrl: string;
	accessModel: SystemAccessModel;
	ipAddress: string;
	userAgent: string;
}

export interface RegisterSystemData {
	systemId: string;
	/** Raw API key — returned exactly once. Never stored. */
	rawApiKey: string;
	/** First 8 characters of rawApiKey — safe to display in future listings. */
	keyPrefix: string;
}

export type RegisterSystemResult = Result<
	RegisterSystemData,
	InvalidApiBaseUrlException | SystemConflictException
>;

export abstract class RegisterSystemUseCasePort {
	abstract execute(
		command: RegisterSystemCommand,
	): Promise<RegisterSystemResult>;
}
