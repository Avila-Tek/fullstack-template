import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { desc, eq } from 'drizzle-orm';
import type {
	SessionDto,
	SessionRepositoryPort,
} from '../../../application/ports/out/session-repository.port';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

@Injectable()
export class DrizzleSessionRepository implements SessionRepositoryPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb,
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

	async deleteById(sessionId: string): Promise<void> {
		await this.db
			.delete(schema.session)
			.where(eq(schema.session.id, sessionId));
	}

	async findByIdWithUser(sessionId: string): Promise<{
		session: { id: string; createdAt: Date; userId: string };
		sessionInvalidBefore: Date | null;
	} | null> {
		const [row] = await this.db
			.select({
				sessionId: schema.session.id,
				sessionCreatedAt: schema.session.createdAt,
				userId: schema.session.userId,
				sessionInvalidBefore: schema.user.sessionInvalidBefore,
			})
			.from(schema.session)
			.innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
			.where(eq(schema.session.id, sessionId))
			.limit(1);

		if (!row) return null;

		return {
			session: {
				id: row.sessionId,
				createdAt: row.sessionCreatedAt,
				userId: row.userId,
			},
			sessionInvalidBefore: row.sessionInvalidBefore,
		};
	}

	async findAllForUser(userId: string): Promise<SessionDto[]> {
		const rows = await this.db
			.select({
				id: schema.session.id,
				userId: schema.session.userId,
				createdAt: schema.session.createdAt,
				expiresAt: schema.session.expiresAt,
				ipAddress: schema.session.ipAddress,
				userAgent: schema.session.userAgent,
				activeOrganizationId: schema.session.activeOrganizationId,
			})
			.from(schema.session)
			.where(eq(schema.session.userId, userId))
			.orderBy(desc(schema.session.createdAt));

		return rows;
	}
}
