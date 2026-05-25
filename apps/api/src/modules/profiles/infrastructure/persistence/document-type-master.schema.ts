import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const documentTypeMaster = pgTable(
	'document_type_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		// Short machine-readable code matching the dniType form values: V | E | J | G | P
		// Added in E-002_S-004 — populated alongside the external system sync.
		code: varchar('code', { length: 5 }).notNull().unique(),
		name: varchar('name', { length: 80 }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		uniqueIndex('uq_document_type_master_code').on(t.code),
		index('ix_document_type_master_name').on(t.name),
		index('ix_document_type_master_is_active').on(t.isActive),
	],
);

export type DocumentTypeMasterRow = typeof documentTypeMaster.$inferSelect;
