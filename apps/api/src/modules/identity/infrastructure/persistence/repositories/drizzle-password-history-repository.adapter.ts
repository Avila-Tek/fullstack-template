import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@/infrastructure/database/drizzle.module';
import type { PasswordHistoryRepositoryPort } from '../../../application/ports/out/password-history-repository.port';
import * as schema from '../db-schema';

const MAX_HISTORY = 5;

@Injectable()
export class DrizzlePasswordHistoryRepository
	implements PasswordHistoryRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findRecentHashes(userId: string, limit: number): Promise<string[]> {
		const rows = await this.db
			.select({ hashedPassword: schema.passwordHistory.hashedPassword })
			.from(schema.passwordHistory)
			.where(eq(schema.passwordHistory.userId, userId))
			.orderBy(desc(schema.passwordHistory.createdAt))
			.limit(limit);

		return rows.map((r) => r.hashedPassword);
	}

	async append(userId: string, hash: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.insert(schema.passwordHistory).values({
				id: crypto.randomUUID(),
				userId,
				hashedPassword: hash,
			});

			// Prune to MAX_HISTORY entries (most recent first)
			const all = await tx
				.select({ id: schema.passwordHistory.id })
				.from(schema.passwordHistory)
				.where(eq(schema.passwordHistory.userId, userId))
				.orderBy(desc(schema.passwordHistory.createdAt));

			if (all.length > MAX_HISTORY) {
				const idsToDelete = all.slice(MAX_HISTORY).map((r) => r.id);
				await tx
					.delete(schema.passwordHistory)
					.where(inArray(schema.passwordHistory.id, idsToDelete));
			}
		});
	}
}
