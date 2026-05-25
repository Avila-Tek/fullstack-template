import { Inject, Injectable } from '@nestjs/common';
import {
	buildPagination,
	type TPagination,
	type TPaginationInput,
} from '@zoom/schemas';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import {
	type InsertMembershipParams,
	type MemberRow,
	SystemMembershipRepositoryPort,
	type UpsertMemberParams,
} from '../../../application/ports/out/system-membership-repository.port';
import type { SystemMembershipEntity } from '../../../domain/entities/system-membership.entity';
import * as schema from '../db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

function rowToMembership(
	row: typeof schema.systemMembership.$inferSelect,
): SystemMembershipEntity {
	return {
		id: row.id,
		systemId: row.systemId,
		organizationId: row.organizationId,
		userId: row.userId,
		role: row.role,
		status: row.status,
		isDeleted: row.isDeleted,
	};
}

@Injectable()
export class DrizzleSystemMembershipRepository
	implements SystemMembershipRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb) {}

	async findByUserAndOrg(
		userId: string,
		organizationId: string,
	): Promise<SystemMembershipEntity | null> {
		const [row] = await this.db
			.select()
			.from(schema.systemMembership)
			.where(
				and(
					eq(schema.systemMembership.userId, userId),
					eq(schema.systemMembership.organizationId, organizationId),
					eq(schema.systemMembership.isDeleted, false),
				),
			)
			.limit(1);
		return row ? rowToMembership(row) : null;
	}

	async findAllBySystem(
		systemId: string,
		pagination: TPaginationInput,
	): Promise<TPagination<MemberRow>> {
		const offset = (pagination.page - 1) * pagination.perPage;

		const [rows, countResult] = await Promise.all([
			this.db
				.select({
					userId: schema.systemMembership.userId,
					email: schema.user.email,
					role: schema.systemMembership.role,
					activated: schema.user.emailVerified,
					createdAt: schema.systemMembership.createdAt,
				})
				.from(schema.systemMembership)
				.innerJoin(
					schema.user,
					eq(schema.user.id, schema.systemMembership.userId),
				)
				.where(
					and(
						eq(schema.systemMembership.systemId, systemId),
						eq(schema.systemMembership.isDeleted, false),
					),
				)
				.orderBy(asc(schema.systemMembership.createdAt))
				.limit(pagination.perPage)
				.offset(offset),
			this.db
				.select({ count: count() })
				.from(schema.systemMembership)
				.where(
					and(
						eq(schema.systemMembership.systemId, systemId),
						eq(schema.systemMembership.isDeleted, false),
					),
				),
		]);

		const total = countResult[0]?.count ?? 0;
		return buildPagination(rows as MemberRow[], total, pagination);
	}

	async insertMembership(
		params: InsertMembershipParams,
	): Promise<SystemMembershipEntity> {
		const [row] = await this.db
			.insert(schema.systemMembership)
			.values({
				userId: params.userId,
				systemId: params.systemId,
				organizationId: params.organizationId,
				role: params.role,
				status: 'active',
				isDeleted: false,
			})
			.returning();
		// biome-ignore lint/style/noNonNullAssertion: guaranteed by INSERT returning
		return rowToMembership(row!);
	}

	async softDeleteByUser(
		userId: string,
		systemId: string,
	): Promise<SystemMembershipEntity | null> {
		const [row] = await this.db
			.update(schema.systemMembership)
			.set({ isDeleted: true, updatedAt: new Date() })
			.where(
				and(
					eq(schema.systemMembership.userId, userId),
					eq(schema.systemMembership.systemId, systemId),
					eq(schema.systemMembership.isDeleted, false),
				),
			)
			.returning();
		return row ? rowToMembership(row) : null;
	}

	async updateMemberRole(
		userId: string,
		systemId: string,
		role: 'member' | 'admin',
	): Promise<SystemMembershipEntity | null> {
		const [row] = await this.db
			.update(schema.systemMembership)
			.set({ role, updatedAt: new Date() })
			.where(
				and(
					eq(schema.systemMembership.userId, userId),
					eq(schema.systemMembership.systemId, systemId),
					eq(schema.systemMembership.isDeleted, false),
				),
			)
			.returning();
		return row ? rowToMembership(row) : null;
	}

	async upsertMember(params: UpsertMemberParams): Promise<void> {
		await this.db
			.insert(schema.systemMembership)
			.values({
				userId: params.userId,
				systemId: params.systemId,
				organizationId: params.organizationId,
				role: params.role,
				status: 'active',
				isDeleted: false,
			})
			.onConflictDoUpdate({
				target: [
					schema.systemMembership.userId,
					schema.systemMembership.organizationId,
				],
				// Matches the partial unique index: uq_system_membership_user_org WHERE is_deleted = false
				targetWhere: sql`${schema.systemMembership.isDeleted} = false`,
				set: {
					role: params.role,
					status: 'active',
					isDeleted: false,
					updatedAt: new Date(),
				},
			});
	}
}
