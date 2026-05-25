import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { stateMaster } from '../../../region/infrastructure/persistence/state-master.schema';
import type {
	AddressRepositoryPort,
	EditContextAddressRecord,
	NewAddressProps,
	ResolvedAddressRecord,
} from '../../application/ports/out/address-repository.port';
import { address } from './address.schema';

@Injectable()
export class DrizzleAddressRepositoryAdapter implements AddressRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async create(data: NewAddressProps): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(address)
			.values({
				formattedAddress: data.formattedAddress,
				addressLine1: data.addressLine1,
				addressLine2: data.addressLine2 ?? null,
				rawQuery: data.rawQuery ?? null,
				suburbText: data.suburbText ?? null,
				postalCodeText: data.postalCodeText ?? null,
				internationalCityText: data.internationalCityText ?? null,
				countryId: data.countryId,
				countryCode: data.countryCode ?? null,
				countryName: data.countryName ?? null,
				stateId: data.stateId ?? null,
				cityId: data.cityId ?? null,
				municipalityId: data.municipalityId ?? null,
				parishId: data.parishId ?? null,
				postalCodeId: data.postalCodeId ?? null,
				geoLat: data.geoLat ?? null,
				geoLng: data.geoLng ?? null,
				geolocationProvider: data.geolocationProvider ?? null,
				providerAddressId: data.providerAddressId ?? null,
				providerRouteCode: data.providerRouteCode ?? null,
				supportedByZoom: data.supportedByZoom ?? false,
				validatedAt: data.validatedAt ?? null,
			})
			.returning({ id: address.id });
		return { id: row.id };
	}

	async findById(id: string): Promise<EditContextAddressRecord | null> {
		const rows = await this.db
			.select({
				id: address.id,
				countryId: address.countryId,
				stateId: address.stateId,
				cityId: address.cityId,
				municipalityId: address.municipalityId,
				parishId: address.parishId,
				postalCodeId: address.postalCodeId,
				addressLine1: address.addressLine1,
				formattedAddress: address.formattedAddress,
			})
			.from(address)
			.where(eq(address.id, id))
			.limit(1);
		return rows[0] ?? null;
	}

	async findResolvedById(id: string): Promise<ResolvedAddressRecord | null> {
		const rows = await this.db
			.select({
				id: address.id,
				addressLine: address.addressLine1,
				cityName: cityMaster.name,
				stateName: stateMaster.name,
			})
			.from(address)
			.leftJoin(
				cityMaster,
				and(eq(address.cityId, cityMaster.id), eq(cityMaster.isActive, true)),
			)
			.leftJoin(
				stateMaster,
				and(
					eq(address.stateId, stateMaster.id),
					eq(stateMaster.isActive, true),
				),
			)
			.where(eq(address.id, id))
			.limit(1);
		return rows[0] ?? null;
	}

	async updateById(id: string, data: NewAddressProps): Promise<void> {
		await this.db
			.update(address)
			.set({
				formattedAddress: data.formattedAddress,
				addressLine1: data.addressLine1,
				addressLine2: data.addressLine2 ?? null,
				rawQuery: data.rawQuery ?? null,
				suburbText: data.suburbText ?? null,
				postalCodeText: data.postalCodeText ?? null,
				internationalCityText: data.internationalCityText ?? null,
				countryId: data.countryId,
				countryCode: data.countryCode ?? null,
				countryName: data.countryName ?? null,
				stateId: data.stateId ?? null,
				cityId: data.cityId ?? null,
				municipalityId: data.municipalityId ?? null,
				parishId: data.parishId ?? null,
				postalCodeId: data.postalCodeId ?? null,
				geoLat: data.geoLat ?? null,
				geoLng: data.geoLng ?? null,
				geolocationProvider: data.geolocationProvider ?? null,
				providerAddressId: data.providerAddressId ?? null,
				providerRouteCode: data.providerRouteCode ?? null,
				supportedByZoom: data.supportedByZoom ?? false,
				validatedAt: data.validatedAt ?? null,
			})
			.where(eq(address.id, id));
	}
}
