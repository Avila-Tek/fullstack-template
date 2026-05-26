import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { officeMaster } from '../../../profiles/infrastructure/persistence/office-master.schema';

export const routeMaster = pgTable(
	'route_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		routeNumber: integer('route_number'),
		name: varchar('name', { length: 120 }).notNull(),
		circuitCode: integer('circuit_code'),
		returnToOffice: boolean('return_to_office'),
		returnOfficeId: uuid('return_office_id').references(() => officeMaster.id),
		vehicleTypeCode: integer('vehicle_type_code'),
		maxWeightKg: numeric('max_weight_kg', { precision: 10, scale: 3 }),
		complexity: varchar('complexity', { length: 50 }),
		ownershipType: integer('ownership_type'),
		coverageType: integer('coverage_type'),
		polygonCode: integer('polygon_code'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', {
			mode: 'date',
			withTimezone: true,
		}).$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_route_master_return_office_id').on(t.returnOfficeId),
		index('ix_route_master_is_active').on(t.isActive),
	],
);

export type RouteMasterRow = typeof routeMaster.$inferSelect;
export type NewRouteMasterRow = typeof routeMaster.$inferInsert;
