import { Inject, Injectable } from '@nestjs/common';
import type { TMunicipalityItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { MunicipalityRepositoryPort } from '../../application/ports/out/municipality-repository.port';
import { municipalityMaster } from './municipality-master.schema';

@Injectable()
export class DrizzleMunicipalityRepositoryAdapter
	implements MunicipalityRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: municipalityMaster.id })
			.from(municipalityMaster)
			.where(eq(municipalityMaster.id, id));
		return rows[0] ?? null;
	}

	async findAllByStateId(stateId: string): Promise<TMunicipalityItem[]> {
		return this.db
			.select({ id: municipalityMaster.id, name: municipalityMaster.name })
			.from(municipalityMaster)
			.where(
				and(
					eq(municipalityMaster.stateId, stateId),
					eq(municipalityMaster.isActive, true),
				),
			)
			.orderBy(municipalityMaster.name)
			.limit(1000);
	}
}
