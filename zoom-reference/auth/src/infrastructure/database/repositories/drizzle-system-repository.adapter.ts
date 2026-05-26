import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
	type CreateApiKeyData,
	type CreateSystemData,
	SystemRepositoryPort,
	type UpdateSystemData,
} from '../../../application/ports/out/system-repository.port';
import { System } from '../../../domain/entities/system.entity';
import { SystemApiKey } from '../../../domain/entities/system-api-key.entity';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

function rowToSystem(row: typeof schema.system.$inferSelect): System {
	return System.reconstitute({
		id: row.id,
		name: row.name,
		slug: row.slug,
		apiBaseUrl: row.apiBaseUrl,
		accessModel: row.accessModel,
		organizationId: row.organizationId,
		status: row.status,
		isDeleted: row.isDeleted,
		deletedByUserId: row.deletedByUserId,
		deletedAt: row.deletedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function rowToApiKey(
	row: typeof schema.systemApiKey.$inferSelect,
): SystemApiKey {
	return SystemApiKey.reconstitute({
		id: row.id,
		systemId: row.systemId,
		keyHash: row.keyHash,
		keyPrefix: row.keyPrefix,
		createdAt: row.createdAt,
		revokedAt: row.revokedAt,
	});
}

@Injectable()
export class DrizzleSystemRepository implements SystemRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async findById(id: string): Promise<System | null> {
		const [row] = await this.db
			.select()
			.from(schema.system)
			.where(and(eq(schema.system.id, id), eq(schema.system.isDeleted, false)))
			.limit(1);
		return row ? rowToSystem(row) : null;
	}

	async findBySlug(slug: string): Promise<System | null> {
		const [row] = await this.db
			.select()
			.from(schema.system)
			.where(
				and(eq(schema.system.slug, slug), eq(schema.system.isDeleted, false)),
			)
			.limit(1);
		return row ? rowToSystem(row) : null;
	}

	async findByName(name: string): Promise<System | null> {
		const [row] = await this.db
			.select()
			.from(schema.system)
			.where(
				and(eq(schema.system.name, name), eq(schema.system.isDeleted, false)),
			)
			.limit(1);
		return row ? rowToSystem(row) : null;
	}

	async findAll(): Promise<System[]> {
		const rows = await this.db
			.select()
			.from(schema.system)
			.where(eq(schema.system.isDeleted, false));
		return rows.map(rowToSystem);
	}

	async create(data: CreateSystemData): Promise<System> {
		const [row] = await this.db
			.insert(schema.system)
			.values({
				id: data.id,
				name: data.name,
				slug: data.slug,
				apiBaseUrl: data.apiBaseUrl,
				accessModel: data.accessModel,
				organizationId: data.organizationId,
			})
			.returning();
		// row is guaranteed to exist after a successful INSERT
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT returning
		return rowToSystem(row!);
	}

	async update(
		systemId: string,
		data: UpdateSystemData,
	): Promise<System | null> {
		const [row] = await this.db
			.update(schema.system)
			.set({
				...(data.name !== undefined && { name: data.name }),
				...(data.slug !== undefined && { slug: data.slug }),
				...(data.apiBaseUrl !== undefined && { apiBaseUrl: data.apiBaseUrl }),
				...(data.accessModel !== undefined && {
					accessModel: data.accessModel,
				}),
			})
			.where(
				and(eq(schema.system.id, systemId), eq(schema.system.isDeleted, false)),
			)
			.returning();
		return row ? rowToSystem(row) : null;
	}

	async deactivate(systemId: string, deletedByUserId: string): Promise<void> {
		// Atomic: revoke all active API keys and mark the system suspended in one transaction.
		await this.db.transaction(async (tx) => {
			await tx
				.update(schema.systemApiKey)
				.set({ revokedAt: new Date() })
				.where(
					and(
						eq(schema.systemApiKey.systemId, systemId),
						isNull(schema.systemApiKey.revokedAt),
					),
				);

			await tx
				.update(schema.system)
				.set({
					isDeleted: true,
					status: 'suspended',
					deletedByUserId,
					deletedAt: new Date(),
				})
				.where(eq(schema.system.id, systemId));
		});
	}

	async createApiKey(data: CreateApiKeyData): Promise<SystemApiKey> {
		const [row] = await this.db
			.insert(schema.systemApiKey)
			.values({
				id: data.id,
				systemId: data.systemId,
				keyHash: data.keyHash,
				keyPrefix: data.keyPrefix,
			})
			.returning();
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT … RETURNING
		return rowToApiKey(row!);
	}

	async findActiveApiKey(systemId: string): Promise<SystemApiKey | null> {
		const [row] = await this.db
			.select()
			.from(schema.systemApiKey)
			.where(
				and(
					eq(schema.systemApiKey.systemId, systemId),
					isNull(schema.systemApiKey.revokedAt),
				),
			)
			.limit(1);
		return row ? rowToApiKey(row) : null;
	}

	async rotateApiKey(
		systemId: string,
		newKeyData: CreateApiKeyData,
	): Promise<SystemApiKey> {
		return this.db.transaction(async (tx) => {
			// Revoke all active keys for this system
			await tx
				.update(schema.systemApiKey)
				.set({ revokedAt: new Date() })
				.where(
					and(
						eq(schema.systemApiKey.systemId, systemId),
						isNull(schema.systemApiKey.revokedAt),
					),
				);

			// Insert the new key
			const [row] = await tx
				.insert(schema.systemApiKey)
				.values({
					id: newKeyData.id,
					systemId: newKeyData.systemId,
					keyHash: newKeyData.keyHash,
					keyPrefix: newKeyData.keyPrefix,
				})
				.returning();

			// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT … RETURNING
			return rowToApiKey(row!);
		});
	}
}
