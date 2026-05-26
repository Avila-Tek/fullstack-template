import {
	boolean,
	index,
	pgTable,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { roleTemplate } from '../../../profiles/infrastructure/persistence/role-template.schema';
import { shippingServiceKeyEnum } from '../../../profiles/infrastructure/persistence/shipping-service-enums.schema';

export const roleTemplateService = pgTable(
	'role_template_service',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roleTemplateId: uuid('role_template_id')
			.notNull()
			.references(() => roleTemplate.id),
		key: shippingServiceKeyEnum('key').notNull(),
		enabled: boolean('enabled').notNull().default(true),
	},
	(t) => [
		uniqueIndex('uq_role_template_service_role_template_id_key').on(
			t.roleTemplateId,
			t.key,
		),
		index('ix_role_template_service_role_template_id_enabled').on(
			t.roleTemplateId,
			t.enabled,
		),
	],
);

export type RoleTemplateServiceRow = typeof roleTemplateService.$inferSelect;
export type NewRoleTemplateServiceRow = typeof roleTemplateService.$inferInsert;
