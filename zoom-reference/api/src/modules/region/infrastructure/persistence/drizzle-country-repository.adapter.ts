import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { CountryRepositoryPort } from '../../application/ports/out/country-repository.port';
import { Country, type NewCountryProps } from '../../domain/country.entity';
import { CountryId } from '../../domain/value-objects/country-id.value-object';
import { countryMaster } from './country-master.schema';

@Injectable()
export class DrizzleCountryRepositoryAdapter implements CountryRepositoryPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async create(country: NewCountryProps): Promise<Country> {
		try {
			const [row] = await this.db
				.insert(countryMaster)
				.values({
					legacyId: country.legacyId,
					isoCode: country.isoCode,
					name: country.name,
					capital: country.capital,
					zoneCode: country.zoneCode,
					zoneMia: country.zoneMia,
					collectTransportCharge: country.collectTransportCharge,
					deliveryTimeDays: country.deliveryTimeDays,
					maritimeTimeDays: country.maritimeTimeDays,
					languageType: country.languageType,
					internationalAreaCode: country.internationalAreaCode,
					dhlName: country.dhlName,
					isInactive: country.isInactive,
				})
				.returning();
			return this.toEntity(row);
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.warn(
				{ event: 'region.repository.upsert_error', errorCode },
				'Country create failed',
			);
			throw err;
		}
	}

	async save(country: Country): Promise<Country> {
		try {
			const [row] = await this.db
				.update(countryMaster)
				.set({
					legacyId: country.legacyId,
					isoCode: country.isoCode,
					name: country.name,
					capital: country.capital,
					zoneCode: country.zoneCode,
					zoneMia: country.zoneMia,
					collectTransportCharge: country.collectTransportCharge,
					deliveryTimeDays: country.deliveryTimeDays,
					maritimeTimeDays: country.maritimeTimeDays,
					languageType: country.languageType,
					internationalAreaCode: country.internationalAreaCode,
					dhlName: country.dhlName,
					isInactive: country.isInactive,
					updatedAt: new Date(),
				})
				.where(eq(countryMaster.id, country.id.value))
				.returning();
			return this.toEntity(row);
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.warn(
				{ event: 'region.repository.upsert_error', errorCode },
				'Country save failed',
			);
			throw err;
		}
	}

	async findById(id: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: countryMaster.id })
			.from(countryMaster)
			.where(eq(countryMaster.id, id));
		return rows[0] ?? null;
	}

	async findByLegacyId(legacyId: number): Promise<Country | null> {
		const result = await this.db
			.select()
			.from(countryMaster)
			.where(eq(countryMaster.legacyId, legacyId));

		return result[0] ? this.toEntity(result[0]) : null;
	}

	async findByIsoCode(isoCode: string): Promise<{ id: string } | null> {
		const rows = await this.db
			.select({ id: countryMaster.id })
			.from(countryMaster)
			.where(eq(countryMaster.isoCode, isoCode));
		return rows[0] ?? null;
	}

	findDefault(): Promise<{ id: string } | null> {
		return this.findByIsoCode('VEN');
	}

	async findAll(): Promise<Country[]> {
		const rows = await this.db.select().from(countryMaster);
		return rows.map((row) => this.toEntity(row));
	}

	private toEntity(row: typeof countryMaster.$inferSelect): Country {
		return Country.restore({
			id: CountryId.create(row.id),
			legacyId: row.legacyId,
			isoCode: row.isoCode ?? null,
			name: row.name,
			capital: row.capital ?? null,
			zoneCode: row.zoneCode ?? null,
			zoneMia: row.zoneMia ?? null,
			collectTransportCharge: row.collectTransportCharge,
			deliveryTimeDays: row.deliveryTimeDays ?? null,
			maritimeTimeDays: row.maritimeTimeDays ?? null,
			languageType: row.languageType ?? null,
			internationalAreaCode: row.internationalAreaCode ?? null,
			dhlName: row.dhlName ?? null,
			isInactive: row.isInactive,
		});
	}
}
