import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import {
	type ChangePasswordAuditEventParams,
	ChangePasswordAuditLogPort,
} from '../../../application/ports/out/change-password-audit-log.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleChangePasswordAuditLogAdapter
	implements ChangePasswordAuditLogPort
{
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async log(params: ChangePasswordAuditEventParams): Promise<void> {
		try {
			await this.db.insert(schema.securityAuditLog).values({
				id: crypto.randomUUID(),
				eventType: params.eventType,
				targetUserId: params.userId ?? null,
				platformAdminUserId: null,
				systemId: null,
				keyPrefix: null,
				ipAddress: params.ipAddress ?? null,
				userAgent: params.userAgent ?? null,
				details: params.details ?? null,
			});
		} catch (error) {
			this.logger.warn(
				{
					eventType: params.eventType,
					error: error instanceof Error ? error.message : String(error),
				},
				'change_password_audit_log_failed',
			);
		}
	}
}
