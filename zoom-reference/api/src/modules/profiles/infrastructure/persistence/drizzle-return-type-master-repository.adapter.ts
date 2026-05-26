import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	ReturnTypeMasterRepositoryPort,
	ReturnTypeRecord,
} from '../../application/ports/out/return-type-master-repository.port';
import { returnTypeMaster } from './return-type-master.schema';

@Injectable()
export class DrizzleReturnTypeMasterRepositoryAdapter
	implements ReturnTypeMasterRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findFirstActive(): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: returnTypeMaster.id })
			.from(returnTypeMaster)
			.where(eq(returnTypeMaster.isActive, true))
			.orderBy(asc(returnTypeMaster.legacyId))
			.limit(1);
		return rows[0] ?? null;
	}

	async findActiveById(id: string): Promise<ReturnTypeRecord | null> {
		const rows = await this.db
			.select({
				id: returnTypeMaster.id,
				legacyId: returnTypeMaster.legacyId,
				name: returnTypeMaster.name,
			})
			.from(returnTypeMaster)
			.where(
				and(eq(returnTypeMaster.id, id), eq(returnTypeMaster.isActive, true)),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async findActiveByLegacyIds(
		legacyIds: number[],
	): Promise<ReturnTypeRecord[]> {
		if (legacyIds.length === 0) return [];
		return this.db
			.select({
				id: returnTypeMaster.id,
				legacyId: returnTypeMaster.legacyId,
				name: returnTypeMaster.name,
			})
			.from(returnTypeMaster)
			.where(
				and(
					inArray(returnTypeMaster.legacyId, legacyIds),
					eq(returnTypeMaster.isActive, true),
				),
			)
			.orderBy(asc(returnTypeMaster.name));
	}
}
