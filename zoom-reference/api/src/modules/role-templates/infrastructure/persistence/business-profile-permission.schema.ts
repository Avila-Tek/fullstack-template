import {
	boolean,
	index,
	pgTable,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import { permissionCatalog } from './permission-catalog.schema';

export const businessProfilePermission = pgTable(
	'business_profile_permission',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissionCatalog.id),
		allowed: boolean('allowed').notNull().default(true),
	},
	(t) => [
		uniqueIndex(
			'uq_business_profile_permission_business_profile_id_permission_id',
		).on(t.businessProfileId, t.permissionId),
		index('ix_business_profile_permission_business_profile_id_allowed').on(
			t.businessProfileId,
			t.allowed,
		),
	],
);

export type BusinessProfilePermissionRow =
	typeof businessProfilePermission.$inferSelect;
export type NewBusinessProfilePermissionRow =
	typeof businessProfilePermission.$inferInsert;
