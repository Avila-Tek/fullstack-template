import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { SystemInactiveException } from '../../domain/exceptions/system-inactive.exception';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import {
	type RotateSystemKeyCommand,
	type RotateSystemKeyResult,
	RotateSystemKeyUseCasePort,
} from '../ports/in/rotate-system-key.use-case.port';
import { ApiKeyHashPort } from '../ports/out/api-key-hash.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

const KEY_BYTE_LENGTH = 32;
const KEY_PREFIX_LENGTH = 8;

// Spec §E-002-S-010: atomically revokes the active API key and issues a new one.
// Only active (non-deleted, non-suspended) systems may rotate keys.
@Injectable()
export class RotateSystemKeyUseCase implements RotateSystemKeyUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly auditLog: SystemAuditLogPort,
		private readonly apiKeyHash: ApiKeyHashPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		command: RotateSystemKeyCommand,
	): Promise<RotateSystemKeyResult> {
		const { systemId, platformAdminUserId, ipAddress, userAgent } = command;

		const system = await this.systemRepo.findById(systemId);
		if (!system) {
			this.logger.warn(
				{
					event: 'auth.system.rotate_key_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_NOT_FOUND',
				},
				'System not found for key rotation',
			);
			return {
				success: false,
				error: new SystemNotFoundException({ systemId }),
			};
		}

		if (system.status !== 'active') {
			this.logger.warn(
				{
					event: 'auth.system.rotate_key_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_INACTIVE',
				},
				'Cannot rotate key for inactive system',
			);
			return {
				success: false,
				error: new SystemInactiveException({ systemId }),
			};
		}

		const rawKey = randomBytes(KEY_BYTE_LENGTH).toString('hex');
		const keyPrefix = rawKey.slice(0, KEY_PREFIX_LENGTH);
		const keyHash = this.apiKeyHash.hash(rawKey);
		const keyId = randomUUID();

		await this.systemRepo.rotateApiKey(systemId, {
			id: keyId,
			systemId,
			keyHash,
			keyPrefix,
		});

		await this.auditLog.log({
			eventType: 'system_key_rotated',
			platformAdminUserId,
			systemId,
			keyPrefix,
			ipAddress,
			userAgent,
		});

		this.logger.info(
			{ event: 'auth.system.key_rotated', platformAdminUserId, systemId },
			'System API key rotated successfully',
		);

		return { success: true, data: { rawApiKey: rawKey, keyPrefix } };
	}
}
