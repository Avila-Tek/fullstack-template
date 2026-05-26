import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { InvalidApiBaseUrlException } from '../../domain/exceptions/invalid-api-base-url.exception';
import { SystemConflictException } from '../../domain/exceptions/system-conflict.exception';
import { SystemNotFoundException } from '../../domain/exceptions/system-not-found.exception';
import { isInvalidUrl } from '../../domain/utils/url.utils';
import {
	type UpdateSystemCommand,
	type UpdateSystemResult,
	UpdateSystemUseCasePort,
} from '../ports/in/update-system.use-case.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

@Injectable()
export class UpdateSystemUseCase implements UpdateSystemUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly auditLog: SystemAuditLogPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(command: UpdateSystemCommand): Promise<UpdateSystemResult> {
		const { systemId, platformAdminUserId, ipAddress, userAgent } = command;

		const existing = await this.systemRepo.findById(systemId);
		if (!existing) {
			this.logger.warn(
				{
					event: 'auth.system.update_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_NOT_FOUND',
				},
				'System not found',
			);
			return {
				success: false,
				error: new SystemNotFoundException({ systemId }),
			};
		}

		if (command.apiBaseUrl !== undefined && isInvalidUrl(command.apiBaseUrl)) {
			this.logger.warn(
				{
					event: 'auth.system.update_error',
					systemId,
					errorCode: 'AUTH_INVALID_API_BASE_URL',
				},
				'Invalid apiBaseUrl provided',
			);
			return {
				success: false,
				error: new InvalidApiBaseUrlException({
					apiBaseUrl: command.apiBaseUrl,
				}),
			};
		}

		// Run slug and name conflict checks in parallel — independent queries.
		// Inline conditions let TypeScript narrow command.slug/name to string.
		const [slugConflict, nameConflict] = await Promise.all([
			command.slug !== undefined && command.slug !== existing.slug
				? this.systemRepo.findBySlug(command.slug)
				: Promise.resolve(null),
			command.name !== undefined && command.name !== existing.name
				? this.systemRepo.findByName(command.name)
				: Promise.resolve(null),
		]);

		if (slugConflict) {
			this.logger.warn(
				{
					event: 'auth.system.update_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_CONFLICT',
				},
				'Slug already exists',
			);
			return {
				success: false,
				error: new SystemConflictException({ conflictField: 'slug' }),
			};
		}

		if (nameConflict) {
			this.logger.warn(
				{
					event: 'auth.system.update_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_CONFLICT',
				},
				'Name already exists',
			);
			return {
				success: false,
				error: new SystemConflictException({ conflictField: 'name' }),
			};
		}

		const updated = await this.systemRepo.update(systemId, {
			name: command.name,
			slug: command.slug,
			apiBaseUrl: command.apiBaseUrl,
			accessModel: command.accessModel,
		});

		if (!updated) {
			this.logger.warn(
				{
					event: 'auth.system.update_error',
					systemId,
					errorCode: 'AUTH_SYSTEM_NOT_FOUND',
				},
				'System disappeared before update committed (TOCTOU)',
			);
			return {
				success: false,
				error: new SystemNotFoundException({ systemId }),
			};
		}

		await this.auditLog.log({
			eventType: 'system_updated',
			platformAdminUserId,
			systemId,
			ipAddress,
			userAgent,
			details: {
				...(command.name !== undefined && { name: command.name }),
				...(command.slug !== undefined && { slug: command.slug }),
				...(command.apiBaseUrl !== undefined && {
					apiBaseUrl: command.apiBaseUrl,
				}),
				...(command.accessModel !== undefined && {
					accessModel: command.accessModel,
				}),
			},
		});

		this.logger.info(
			{ event: 'auth.system.updated', platformAdminUserId, systemId },
			'System updated successfully',
		);

		return { success: true, data: updated };
	}
}
