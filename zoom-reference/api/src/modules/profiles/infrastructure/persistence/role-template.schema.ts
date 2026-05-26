import {
	boolean,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const roleTemplate = pgTable('role_template', {
	id: uuid('id').primaryKey().defaultRandom(),
	key: varchar('key', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 120 }).notNull(),
	description: varchar('description', { length: 255 }),
	isDeleted: boolean('is_deleted').notNull().default(false),
	// References user.id in apps/auth DB (cross-schema, no FK constraint)
	deletedByUserId: uuid('deleted_by_user_id'),
	deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
});

export type RoleTemplateRow = typeof roleTemplate.$inferSelect;
