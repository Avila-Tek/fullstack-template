import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import {
	type CityTaxRates,
	CityTaxRatesReaderPort,
} from '../../../pricing/application/ports/out/city-tax-rates-reader.port';
import { cityMaster } from '../persistence/city-master.schema';

/**
 * Reads the 4 denormalized VAT/surcharge columns off a single city_master row.
 *
 * LEGACY: replaces the back-to-back `funiva` + `funcomplemento` PG stored
 * functions per Deviation 3 — both values live on the same row in the new
 * denormalized model, so one query returns both.
 */
@Injectable()
export class CityTaxRatesReaderAdapter implements CityTaxRatesReaderPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findCityTaxRates(cityId: string): Promise<CityTaxRates | null> {
		const rows = await this.db
			.select({
				nationalVatRate: cityMaster.nationalVatRate,
				nationalSurchargeRate: cityMaster.nationalSurchargeRate,
				internationalVatRate: cityMaster.internationalVatRate,
				internationalSurchargeRate: cityMaster.internationalSurchargeRate,
			})
			.from(cityMaster)
			.where(eq(cityMaster.id, cityId))
			.limit(1);
		return rows[0] ?? null;
	}
}
