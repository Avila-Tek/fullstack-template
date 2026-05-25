import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const systemStatusEnum = pgEnum('system_status', [
	'active',
	'suspended',
]);
export const systemAccessModelEnum = pgEnum('system_access_model', [
	'open',
	'restricted',
]);

export const system = pgTable(
	'system',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 120 }).notNull(),
		slug: varchar('slug', { length: 120 }).notNull(),
		// Public base URL — also used as the JWT `aud` claim in S-011
		apiBaseUrl: varchar('api_base_url', { length: 2048 }).notNull(),
		accessModel: systemAccessModelEnum('access_model').notNull(),
		// Better Auth Organization ID (text — BA org IDs are not UUIDs)
		organizationId: text('organization_id').notNull(),
		status: systemStatusEnum('status').notNull().default('active'),

		// Soft-delete columns — logical deletion only; rows are never hard-deleted
		isDeleted: boolean('is_deleted').notNull().default(false),
		// FK → user.id (Better Auth uses text PKs for users)
		deletedByUserId: text('deleted_by_user_id'),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_system_status').on(t.status),
		index('ix_system_access_model_status').on(t.accessModel, t.status),
		// Partial unique indexes — enforce uniqueness only for non-deleted rows.
		// Drizzle 0.30+ supports .where() on index definitions.
		uniqueIndex('uq_system_name_active')
			.on(t.name)
			.where(sql`${t.isDeleted} = false`),
		uniqueIndex('uq_system_slug_active')
			.on(t.slug)
			.where(sql`${t.isDeleted} = false`),
	],
);

export type System = typeof system.$inferSelect;
export type NewSystem = typeof system.$inferInsert;
