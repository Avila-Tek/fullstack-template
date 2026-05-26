import { Inject, Injectable } from '@nestjs/common';
import type { TStateItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type { RegionState } from '../../application/ports/out/state-repository.port';
import { StateRepositoryPort } from '../../application/ports/out/state-repository.port';
import { stateMaster } from './state-master.schema';

@Injectable()
export class DrizzleStateRepositoryAdapter implements StateRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<RegionState | null> {
		const rows = await this.db
			.select({ id: stateMaster.id, countryId: stateMaster.countryId })
			.from(stateMaster)
			.where(and(eq(stateMaster.id, id), eq(stateMaster.isActive, true)));
		return rows[0] ?? null;
	}

	async findNameById(id: string): Promise<string | null> {
		const rows = await this.db
			.select({ name: stateMaster.name })
			.from(stateMaster)
			.where(and(eq(stateMaster.id, id), eq(stateMaster.isActive, true)))
			.limit(1);
		return rows[0]?.name ?? null;
	}

	async findAllByCountryId(countryId: string): Promise<TStateItem[]> {
		return this.db
			.select({ id: stateMaster.id, name: stateMaster.name })
			.from(stateMaster)
			.where(
				and(
					eq(stateMaster.countryId, countryId),
					eq(stateMaster.isActive, true),
				),
			)
			.orderBy(stateMaster.name)
			.limit(1000);
	}
}
