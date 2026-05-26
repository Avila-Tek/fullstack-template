import type { Result } from '@zoom/utils';
import type { SystemInactiveException } from '../../../domain/exceptions/system-inactive.exception';
import type { SystemNotFoundException } from '../../../domain/exceptions/system-not-found.exception';

export interface RotateSystemKeyCommand {
	systemId: string;
	platformAdminUserId: string;
	ipAddress: string;
	userAgent: string;
}

export interface RotateSystemKeyData {
	/** New raw API key — returned exactly once. Never stored. */
	rawApiKey: string;
	/** First 8 characters of rawApiKey — safe to display in future listings. */
	keyPrefix: string;
}

export type RotateSystemKeyResult = Result<
	RotateSystemKeyData,
	SystemNotFoundException | SystemInactiveException
>;

export abstract class RotateSystemKeyUseCasePort {
	abstract execute(
		command: RotateSystemKeyCommand,
	): Promise<RotateSystemKeyResult>;
}
