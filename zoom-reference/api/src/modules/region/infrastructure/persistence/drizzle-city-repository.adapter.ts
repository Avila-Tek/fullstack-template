import { Inject, Injectable } from '@nestjs/common';
import type { TCityItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { CityRepositoryPort } from '../../application/ports/out/city-repository.port';
import { cityMaster } from './city-master.schema';

@Injectable()
export class DrizzleCityRepositoryAdapter implements CityRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: cityMaster.id })
			.from(cityMaster)
			.where(eq(cityMaster.id, id));
		return rows[0] ?? null;
	}

	async findNameById(id: string): Promise<string | null> {
		const rows = await this.db
			.select({ name: cityMaster.name })
			.from(cityMaster)
			.where(and(eq(cityMaster.id, id), eq(cityMaster.isActive, true)))
			.limit(1);
		return rows[0]?.name ?? null;
	}

	async findLegacyIdById(id: string): Promise<number | null> {
		const rows = await this.db
			.select({ legacyId: cityMaster.legacyId })
			.from(cityMaster)
			.where(and(eq(cityMaster.id, id), eq(cityMaster.isActive, true)))
			.limit(1);
		return rows[0]?.legacyId ?? null;
	}

	async findAll(stateId?: string): Promise<TCityItem[]> {
		const condition = stateId
			? and(eq(cityMaster.stateId, stateId), eq(cityMaster.isActive, true))
			: eq(cityMaster.isActive, true);
		return this.db
			.select({ id: cityMaster.id, name: cityMaster.name })
			.from(cityMaster)
			.where(condition)
			.orderBy(cityMaster.name)
			.limit(1000);
	}
}
