import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@/infrastructure/database/drizzle.module';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';
import type { SessionRepositoryPort } from '../../../application/ports/out/session-repository.port';
import * as schema from '../db-schema';

@Injectable()
export class DrizzleSessionRepository implements SessionRepositoryPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async revokeAllForUser(userId: string): Promise<number> {
		const deleted = await this.db
			.delete(schema.session)
			.where(eq(schema.session.userId, userId))
			.returning({ id: schema.session.id });
		const count = deleted.length;
		this.logger.info(
			{ event: 'repository.session.bulk_revoke', userId, count },
			'Sessions revoked for user',
		);
		return count;
	}
}
