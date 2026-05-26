import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const appSectionsEnum = pgEnum('app_sections', [
	'users',
	'settings',
	'profile',
	'tracking',
	'dashboard',
	'quotation_tool',
	'pre_shipments',
	'public_home',
]);

export const appTutorialVideo = pgTable(
	'app_tutorial_video',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		section_key: appSectionsEnum('section_key').notNull(),
		title: varchar('title', { length: 255 }).notNull(),
		youtube_url: text('youtube_url').notNull(),
		youtube_video_id: varchar('youtube_video_id', { length: 50 }),
		description: text('description'),
		sort_order: integer('sort_order').notNull().default(0),
		is_deleted: boolean('is_deleted').notNull().default(false),
		deleted_by_user_id: uuid('deleted_by_user_id'),
		deleted_at: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
		created_at: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updated_at: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_app_tutorial_video_section_active_sort').on(
			t.section_key,
			t.is_deleted,
			t.sort_order,
		),
		uniqueIndex('ix_app_tutorial_video_active_public_home')
			.on(t.section_key)
			.where(sql`${t.is_deleted} = false AND ${t.section_key} = 'public_home'`),
	],
);

export type AppTutorialVideoRow = typeof appTutorialVideo.$inferSelect;
