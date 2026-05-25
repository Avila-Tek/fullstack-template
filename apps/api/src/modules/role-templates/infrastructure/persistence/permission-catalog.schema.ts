import {
	boolean,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const permissionKeyEnum = pgEnum('permission_key', [
	'share_guide_recipients',
	'share_locker_recipients',
	'view_reports',
]);

export const permissionCatalog = pgTable('permission_catalog', {
	id: uuid('id').primaryKey().defaultRandom(),
	key: permissionKeyEnum('key').notNull().unique(),
	name: varchar('name', { length: 120 }).notNull(),
	description: varchar('description', { length: 255 }),
	isDeleted: boolean('is_deleted').notNull().default(false),
	// Cross-DB ref to auth.user.id — no FK constraint
	deletedByUserId: uuid('deleted_by_user_id'),
	deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
});

export type PermissionCatalogRow = typeof permissionCatalog.$inferSelect;
export type NewPermissionCatalogRow = typeof permissionCatalog.$inferInsert;
