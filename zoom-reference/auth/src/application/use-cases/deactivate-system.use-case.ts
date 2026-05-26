import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import {
	type DeactivateSystemCommand,
	type DeactivateSystemResult,
	DeactivateSystemUseCasePort,
} from '../ports/in/deactivate-system.use-case.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

// Spec §E-002-S-010: soft-deletes a system and revokes any active API keys.
// Idempotent on already-deleted systems (treated as not-found).
@Injectable()
export class DeactivateSystemUseCase implements DeactivateSystemUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly auditLog: SystemAuditLogPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		command: DeactivateSystemCommand,
	): Promise<DeactivateSystemResult> {
		const { systemId, platformAdminUserId, ipAddress, userAgent } = command;

		const system = await this.systemRepo.findById(systemId);
		if (!system) {
			this.logger.warn(
				{
					event: 'auth.system.deactivate_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_NOT_FOUND',
				},
				'System not found for deactivation',
			);
			return {
				success: false,
				error: new SystemNotFoundException({ systemId }),
			};
		}

		await this.systemRepo.deactivate(systemId, platformAdminUserId);

		await this.auditLog.log({
			eventType: 'system_deactivated',
			platformAdminUserId,
			systemId,
			ipAddress,
			userAgent,
			details: { name: system.name, slug: system.slug },
		});

		this.logger.info(
			{ event: 'auth.system.deactivated', platformAdminUserId, systemId },
			'System deactivated successfully',
		);

		return { success: true, data: null };
	}
}
