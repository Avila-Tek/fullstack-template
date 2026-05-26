import { Inject, Injectable } from '@nestjs/common';
import type {
	InsertSessionEventParams,
	SessionAuditLogRepositoryPort,
} from '../../../application/ports/out/session-audit-log-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleSessionAuditLogRepository
	implements SessionAuditLogRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async insertEvent(params: InsertSessionEventParams): Promise<void> {
		await this.db.insert(schema.sessionAuditLog).values({
			id: crypto.randomUUID(),
			userId: params.userId,
			sessionId: params.sessionId ?? null,
			systemId: params.systemId ?? null,
			eventType: params.eventType,
			ipAddress: params.ipAddress ?? null,
			userAgent: params.userAgent ?? null,
			correlationId: params.correlationId,
			failureReason: params.failureReason ?? null,
		});
	}
}
