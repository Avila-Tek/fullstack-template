import { Inject, Injectable } from '@nestjs/common';
import type { TPostalCodeItem } from '@zoom/schemas';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { PostalCodeRepositoryPort } from '../../application/ports/out/postal-code-repository.port';
import { postalCodeMaster } from './postal-code-master.schema';

@Injectable()
export class DrizzlePostalCodeRepositoryAdapter
	implements PostalCodeRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findById(id: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: postalCodeMaster.id })
			.from(postalCodeMaster)
			.where(eq(postalCodeMaster.id, id));
		return rows[0] ?? null;
	}

	async findAllByCityId(cityId: string): Promise<TPostalCodeItem[]> {
		return this.db
			.select({
				id: postalCodeMaster.id,
				postalCode: postalCodeMaster.postalCode,
			})
			.from(postalCodeMaster)
			.where(
				and(
					eq(postalCodeMaster.cityId, cityId),
					eq(postalCodeMaster.isActive, true),
				),
			)
			.orderBy(postalCodeMaster.postalCode)
			.limit(1000);
	}
}
