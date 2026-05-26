import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';

export const transitMatrix = pgTable(
	'transit_matrix',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		originCityId: uuid('origin_city_id')
			.notNull()
			.references(() => cityMaster.id),
		destinationCityId: uuid('destination_city_id')
			.notNull()
			.references(() => cityMaster.id),
		weightTypeCode: integer('weight_type_code').notNull(),
		merchandiseDays: integer('merchandise_days'),
		documentDays: integer('document_days'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		uniqueIndex('uq_transit_matrix_origin_destination_weight_type').on(
			t.originCityId,
			t.destinationCityId,
			t.weightTypeCode,
		),
		index('ix_transit_matrix_is_active').on(t.isActive),
	],
);

export type TransitMatrixRow = typeof transitMatrix.$inferSelect;
export type NewTransitMatrixRow = typeof transitMatrix.$inferInsert;
