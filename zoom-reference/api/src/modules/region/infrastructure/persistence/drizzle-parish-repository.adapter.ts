import { Inject, Injectable } from '@nestjs/common';
import type { TParishItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { ParishRepositoryPort } from '../../application/ports/out/parish-repository.port';
import { parishMaster } from './parish-master.schema';

@Injectable()
export class DrizzleParishRepositoryAdapter implements ParishRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: parishMaster.id })
			.from(parishMaster)
			.where(eq(parishMaster.id, id));
		return rows[0] ?? null;
	}

	async findAllByMunicipalityId(
		municipalityId: string,
	): Promise<TParishItem[]> {
		return this.db
			.select({ id: parishMaster.id, name: parishMaster.name })
			.from(parishMaster)
			.where(
				and(
					eq(parishMaster.municipalityId, municipalityId),
					eq(parishMaster.isActive, true),
				),
			)
			.orderBy(parishMaster.name)
			.limit(1000);
	}
}
