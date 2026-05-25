import { Inject, Injectable } from '@nestjs/common';
import type { TUnitOfMeasure } from '@zoom/schemas';
import { and, asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	UnitOfMeasureMasterRepositoryPort,
	UnitTypeCode,
} from '../../application/ports/out/unit-of-measure-master-repository.port';
import { unitOfMeasureMaster } from './unit-of-measure-master.schema';

const UNIT_COLUMNS = {
	id: unitOfMeasureMaster.id,
	code: unitOfMeasureMaster.code,
	name: unitOfMeasureMaster.name,
	unitTypeCode: unitOfMeasureMaster.unitTypeCode,
} as const;

@Injectable()
export class DrizzleUnitOfMeasureMasterRepositoryAdapter
	implements UnitOfMeasureMasterRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findFirstActiveByTypeCode(
		typeCode: UnitTypeCode,
	): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: unitOfMeasureMaster.id })
			.from(unitOfMeasureMaster)
			.where(
				and(
					eq(unitOfMeasureMaster.isActive, true),
					eq(unitOfMeasureMaster.unitTypeCode, typeCode),
				),
			)
			.orderBy(asc(unitOfMeasureMaster.legacyId))
			.limit(1);
		return rows[0] ?? null;
	}

	async findAllActiveByTypeCode(
		typeCode: UnitTypeCode,
	): Promise<TUnitOfMeasure[]> {
		return this.db
			.select(UNIT_COLUMNS)
			.from(unitOfMeasureMaster)
			.where(
				and(
					eq(unitOfMeasureMaster.isActive, true),
					eq(unitOfMeasureMaster.unitTypeCode, typeCode),
				),
			)
			.orderBy(asc(unitOfMeasureMaster.legacyId));
	}

	async findActiveById(id: string): Promise<TUnitOfMeasure | null> {
		const rows = await this.db
			.select(UNIT_COLUMNS)
			.from(unitOfMeasureMaster)
			.where(
				and(
					eq(unitOfMeasureMaster.id, id),
					eq(unitOfMeasureMaster.isActive, true),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}
}
