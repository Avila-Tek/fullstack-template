import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { InvalidApiBaseUrlException } from '../../domain/exceptions/invalid-api-base-url.exception';
import { SystemConflictException } from '../../domain/exceptions/system-conflict.exception';
import { isInvalidUrl } from '../../domain/utils/url.utils';
import {
	type RegisterSystemCommand,
	type RegisterSystemResult,
	RegisterSystemUseCasePort,
} from '../ports/in/register-system.use-case.port';
import { ApiKeyHashPort } from '../ports/out/api-key-hash.port';
import { BetterAuthOrgPort } from '../ports/out/better-auth-org.port';
import { SystemAuditLogPort } from '../ports/out/system-audit-log.port';
import { SystemRepositoryPort } from '../ports/out/system-repository.port';

const KEY_BYTE_LENGTH = 32;
const KEY_PREFIX_LENGTH = 8;

// Spec §E-002-S-010: registers a new consuming application with the IdP.
// Creates a Better Auth organization, a system record, and an initial API key.
// The raw API key is returned once and never stored.
@Injectable()
export class RegisterSystemUseCase implements RegisterSystemUseCasePort {
	constructor(
		private readonly systemRepo: SystemRepositoryPort,
		private readonly orgPort: BetterAuthOrgPort,
		private readonly auditLog: SystemAuditLogPort,
		private readonly apiKeyHash: ApiKeyHashPort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(command: RegisterSystemCommand): Promise<RegisterSystemResult> {
		const {
			platformAdminUserId,
			name,
			slug,
			apiBaseUrl,
			accessModel,
			ipAddress,
			userAgent,
		} = command;

		if (isInvalidUrl(apiBaseUrl)) {
			this.logger.warn(
				{
					event: 'auth.system.register_error',
					platformAdminUserId,
					slug,
					errorCode: 'AUTH_INVALID_API_BASE_URL',
				},
				'Invalid apiBaseUrl provided',
			);
			return {
				success: false,
				error: new InvalidApiBaseUrlException({ apiBaseUrl }),
			};
		}

		const [existingSlug, existingName] = await Promise.all([
			this.systemRepo.findBySlug(slug),
			this.systemRepo.findByName(name),
		]);

		if (existingSlug !== null || existingName !== null) {
			const conflictField = existingSlug !== null ? 'slug' : 'name';
			this.logger.warn(
				{
					event: 'auth.system.register_error',
					platformAdminUserId,
					slug,
					name,
					errorCode: 'AUTH_SYSTEM_CONFLICT',
				},
				`System ${conflictField} already exists`,
			);
			return {
				success: false,
				error: new SystemConflictException({ conflictField }),
			};
		}

		const { organizationId } = await this.orgPort.createOrganization(
			name,
			slug,
			platformAdminUserId,
		);

		const systemId = randomUUID();
		const rawKey = randomBytes(KEY_BYTE_LENGTH).toString('hex');
		const keyPrefix = rawKey.slice(0, KEY_PREFIX_LENGTH);
		const keyHash = this.apiKeyHash.hash(rawKey);
		const keyId = randomUUID();

		await this.systemRepo.create({
			id: systemId,
			name,
			slug,
			apiBaseUrl,
			accessModel,
			organizationId,
		});

		await this.systemRepo.createApiKey({
			id: keyId,
			systemId,
			keyHash,
			keyPrefix,
		});

		await this.auditLog.log({
			eventType: 'system_registered',
			platformAdminUserId,
			systemId,
			keyPrefix,
			ipAddress,
			userAgent,
			details: { name, slug, accessModel },
		});

		this.logger.info(
			{ event: 'auth.system.registered', platformAdminUserId, systemId, slug },
			'System registered successfully',
		);

		return { success: true, data: { systemId, rawApiKey: rawKey, keyPrefix } };
	}
}
