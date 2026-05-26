import { Inject, Injectable } from '@nestjs/common';
import {
	type SystemAuditEventParams,
	SystemAuditLogPort,
} from '../../../application/ports/out/system-audit-log.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleSystemAuditLogAdapter implements SystemAuditLogPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async log(params: SystemAuditEventParams): Promise<void> {
		await this.db.insert(schema.securityAuditLog).values({
			id: crypto.randomUUID(),
			eventType: params.eventType,
			platformAdminUserId: params.platformAdminUserId ?? null,
			targetUserId: params.targetUserId ?? null,
			systemId: params.systemId ?? null,
			keyPrefix: params.keyPrefix ?? null,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
			details: params.details ?? null,
		});
	}
}
