import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import type {
	CityWithOfficesRecord,
	OfficeMasterRepositoryPort,
	OfficeRecord,
} from '../../application/ports/out/office-master-repository.port';
import { officeMaster } from './office-master.schema';

@Injectable()
export class DrizzleOfficeMasterRepositoryAdapter
	implements OfficeMasterRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findActiveById(id: string): Promise<OfficeRecord | null> {
		const rows = await this.db
			.select({
				id: officeMaster.id,
				name: officeMaster.name,
				address: officeMaster.address,
			})
			.from(officeMaster)
			.innerJoin(cityMaster, eq(officeMaster.cityId, cityMaster.id))
			.where(
				and(
					eq(officeMaster.id, id),
					eq(officeMaster.isActive, true),
					eq(cityMaster.isActive, true),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async findActiveByCityId(cityId: string): Promise<OfficeRecord[]> {
		return this.db
			.select({
				id: officeMaster.id,
				name: officeMaster.name,
				address: officeMaster.address,
			})
			.from(officeMaster)
			.innerJoin(cityMaster, eq(officeMaster.cityId, cityMaster.id))
			.where(
				and(
					eq(officeMaster.cityId, cityId),
					eq(officeMaster.isActive, true),
					eq(cityMaster.isActive, true),
				),
			)
			.orderBy(asc(officeMaster.name));
	}

	async findDistinctActiveCities(): Promise<CityWithOfficesRecord[]> {
		const rows = await this.db
			.selectDistinct({
				id: cityMaster.id,
				name: cityMaster.name,
			})
			.from(officeMaster)
			.innerJoin(cityMaster, eq(officeMaster.cityId, cityMaster.id))
			.where(
				and(eq(officeMaster.isActive, true), eq(cityMaster.isActive, true)),
			)
			.orderBy(asc(cityMaster.name));
		return rows;
	}
}
