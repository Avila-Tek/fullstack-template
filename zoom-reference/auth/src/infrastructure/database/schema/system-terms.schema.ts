import { sql } from 'drizzle-orm';
import {
	char,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

const TERMS_STATUS_VALUES = ['draft', 'active', 'retired'] as const;

export const termsStatusEnum = pgEnum('terms_status', TERMS_STATUS_VALUES);

export const systemTerms = pgTable(
	'system_terms',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// FK → system.id — stored as uuid; no Drizzle FK constraint needed for v1
		systemId: uuid('system_id').notNull(),
		version: varchar('version', { length: 50 }).notNull(),
		status: termsStatusEnum('status').notNull().default('draft'),
		title: varchar('title', { length: 200 }).notNull(),
		content: text('content').notNull(),
		contentHash: char('content_hash', { length: 64 }), // SHA-256 hex; nullable
		publishedAt: timestamp('published_at', { withTimezone: true }),
		effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
		retiredAt: timestamp('retired_at', { withTimezone: true }),
		// FK → user.id (Better Auth uses text PKs; store as text to match)
		createdByUserId: text('created_by_user_id'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex('uq_system_terms_system_version').on(t.systemId, t.version),
		// Partial unique index: only one active version per system.
		uniqueIndex('uq_system_terms_system_status')
			.on(t.systemId, t.status)
			// Keep magic string literal. Can't use enum because of https://github.com/drizzle-team/drizzle-orm/issues/4790
			.where(sql`${t.status} = 'active'`),
	],
);

export type SystemTerms = typeof systemTerms.$inferSelect;
export type NewSystemTerms = typeof systemTerms.$inferInsert;
