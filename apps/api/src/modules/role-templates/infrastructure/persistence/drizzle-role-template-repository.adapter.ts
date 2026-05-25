import { Inject, Injectable } from '@nestjs/common';
import type {
	TRoleTemplateDetailOutput,
	TRoleTemplatesListOutput,
} from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { roleTemplate } from '../../../profiles/infrastructure/persistence/role-template.schema';
import type { RoleTemplateRepositoryPort } from '../../application/ports/out/role-template-repository.port';
import { permissionCatalog } from './permission-catalog.schema';
import { roleTemplatePermission } from './role-template-permission.schema';
import { roleTemplateService } from './role-template-service.schema';

@Injectable()
export class DrizzleRoleTemplateRepositoryAdapter
	implements RoleTemplateRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	findAll(): Promise<TRoleTemplatesListOutput> {
		return this.db
			.select({
				id: roleTemplate.id,
				key: roleTemplate.key,
				name: roleTemplate.name,
				description: roleTemplate.description,
			})
			.from(roleTemplate)
			.where(eq(roleTemplate.isDeleted, false))
			.orderBy(roleTemplate.name);
	}

	async findById(id: string): Promise<TRoleTemplateDetailOutput | null> {
		const templateRows = await this.db
			.select({
				id: roleTemplate.id,
				key: roleTemplate.key,
				name: roleTemplate.name,
				description: roleTemplate.description,
			})
			.from(roleTemplate)
			.where(and(eq(roleTemplate.id, id), eq(roleTemplate.isDeleted, false)))
			.limit(1);

		if (templateRows.length === 0) return null;

		const template = templateRows[0];

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

		return { ...template, services, permissions };
	}
}
