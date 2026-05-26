import { Inject, Injectable } from '@nestjs/common';
import type { TPermissionKey } from '@zoom/schemas';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { businessProfilePermission } from '../../../role-templates/infrastructure/persistence/business-profile-permission.schema';
import { permissionCatalog } from '../../../role-templates/infrastructure/persistence/permission-catalog.schema';
import {
	type BusinessProfilePermissionProps,
	BusinessProfilePermissionRepositoryPort,
} from '../../application/ports/out/business-profile-permission-repository.port';
import { InvalidPermissionKeyException } from '../../domain/exceptions/invalid-permission-key.exception';

@Injectable()
export class DrizzleBusinessProfilePermissionRepositoryAdapter extends BusinessProfilePermissionRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {
		super();
	}

	async upsertAllForProfile(
		businessProfileId: string,
		data: BusinessProfilePermissionProps[],
	): Promise<void> {
		// Empty submission is treated as a no-op — callers that intend to update
		// permissions must always pass a non-empty array.
		if (data.length === 0) return;

		const { rows, submittedPermissionIds } = await this.resolveRows(
			businessProfileId,
			data,
		);

		if (rows.length > 0) {
			await this.db
				.insert(businessProfilePermission)
				.values(rows)
				.onConflictDoUpdate({
					target: [
						businessProfilePermission.businessProfileId,
						businessProfilePermission.permissionId,
					],
					set: { allowed: sql`excluded.allowed` },
				});
		}

		await this.db
			.update(businessProfilePermission)
			.set({ allowed: false })
			.where(
				and(
					eq(businessProfilePermission.businessProfileId, businessProfileId),
					notInArray(
						businessProfilePermission.permissionId,
						submittedPermissionIds,
					),
				),
			);
	}

	async findAllForProfile(
		businessProfileId: string,
	): Promise<Array<{ key: TPermissionKey; allowed: boolean }>> {
		return this.db
			.select({
				key: permissionCatalog.key,
				allowed: businessProfilePermission.allowed,
			})
			.from(businessProfilePermission)
			.innerJoin(
				permissionCatalog,
				eq(businessProfilePermission.permissionId, permissionCatalog.id),
			)
			.where(
				eq(businessProfilePermission.businessProfileId, businessProfileId),
			);
	}

	private async resolveRows(
		businessProfileId: string,
		data: BusinessProfilePermissionProps[],
	): Promise<{
		rows: Array<{
			businessProfileId: string;
			permissionId: string;
			allowed: boolean;
		}>;
		submittedPermissionIds: string[];
	}> {
		const keys = data.map((d) => d.key);
		const catalogRows = await this.db
			.select({ id: permissionCatalog.id, key: permissionCatalog.key })
			.from(permissionCatalog)
			.where(inArray(permissionCatalog.key, keys));

		const permIdByKey = new Map(catalogRows.map((r) => [r.key, r.id]));
		const resolvedKeys = new Set(catalogRows.map((r) => r.key));

		// Validate all submitted keys exist in the catalog
		const invalidKeys = keys.filter((key) => !resolvedKeys.has(key));
		if (invalidKeys.length > 0) {
			throw new InvalidPermissionKeyException(invalidKeys);
		}

		const submittedPermissionIds = catalogRows.map((r) => r.id);

		const rows = data.map((d) => {
			// Safe: all keys validated above, would have thrown if missing
			// biome-ignore lint/style/noNonNullAssertion: validated above
			const permissionId = permIdByKey.get(d.key)!;
			return { businessProfileId, permissionId, allowed: d.allowed };
		});

		return { rows, submittedPermissionIds };
	}
}
