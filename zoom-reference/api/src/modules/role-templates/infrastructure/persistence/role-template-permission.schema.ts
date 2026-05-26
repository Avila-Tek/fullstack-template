import {
	boolean,
	index,
	pgTable,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { roleTemplate } from '../../../profiles/infrastructure/persistence/role-template.schema';
import { permissionCatalog } from './permission-catalog.schema';

export const roleTemplatePermission = pgTable(
	'role_template_permission',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		roleTemplateId: uuid('role_template_id')
			.notNull()
			.references(() => roleTemplate.id),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissionCatalog.id),
		allowed: boolean('allowed').notNull().default(true),
	},
	(t) => [
		uniqueIndex(
			'uq_role_template_permission_role_template_id_permission_id',
		).on(t.roleTemplateId, t.permissionId),
		index('ix_role_template_permission_role_template_id_allowed').on(
			t.roleTemplateId,
			t.allowed,
		),
	],
);

export type RoleTemplatePermissionRow =
	typeof roleTemplatePermission.$inferSelect;
export type NewRoleTemplatePermissionRow =
	typeof roleTemplatePermission.$inferInsert;
