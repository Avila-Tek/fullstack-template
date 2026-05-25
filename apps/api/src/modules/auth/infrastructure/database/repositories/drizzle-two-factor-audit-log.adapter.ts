import { Inject, Injectable } from '@nestjs/common';
import type {
	InsertTwoFactorEventParams,
	TwoFactorAuditLogRepositoryPort,
} from '../../../application/ports/out/two-factor-audit-log-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleTwoFactorAuditLogAdapter
	implements TwoFactorAuditLogRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async insertEvent(params: InsertTwoFactorEventParams): Promise<void> {
		await this.db.insert(schema.twoFactorAuditLog).values({
			id: crypto.randomUUID(),
			userId: params.userId,
			eventType: params.eventType,
			correlationId: params.correlationId,
			ipHash: params.ipHash,
			userAgent: params.userAgent,
			method: params.method ?? null,
		});
	}
}
