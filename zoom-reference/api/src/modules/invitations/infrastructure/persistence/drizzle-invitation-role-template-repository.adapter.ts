import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { roleTemplate } from '../../../profiles/infrastructure/persistence/role-template.schema';
import { permissionCatalog } from '../../../role-templates/infrastructure/persistence/permission-catalog.schema';
import { roleTemplatePermission } from '../../../role-templates/infrastructure/persistence/role-template-permission.schema';
import { roleTemplateService } from '../../../role-templates/infrastructure/persistence/role-template-service.schema';
import type {
	InvitationRoleTemplateRepositoryPort,
	RoleTemplateDefaultsRecord,
} from '../../application/ports/out/invitation-role-template-repository.port';

@Injectable()
export class DrizzleInvitationRoleTemplateRepositoryAdapter
	implements InvitationRoleTemplateRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findWithDefaults(
		id: string,
	): Promise<RoleTemplateDefaultsRecord | null> {
		const templateRows = await this.db
			.select({ id: roleTemplate.id })
			.from(roleTemplate)
			.where(and(eq(roleTemplate.id, id), eq(roleTemplate.isDeleted, false)))
			.limit(1);

		if (templateRows.length === 0) return null;

		const [services, permissions] = await Promise.all([
			this.db
				.select({
					key: roleTemplateService.key,
					enabled: roleTemplateService.enabled,
				})
				.from(roleTemplateService)
				.where(eq(roleTemplateService.roleTemplateId, id)),
			this.db
				.select({
					key: permissionCatalog.key,
					allowed: roleTemplatePermission.allowed,
				})
				.from(roleTemplatePermission)
				.innerJoin(
					permissionCatalog,
					eq(roleTemplatePermission.permissionId, permissionCatalog.id),
				)
				.where(eq(roleTemplatePermission.roleTemplateId, id)),
		]);

		return { id, services, permissions };
	}
}
