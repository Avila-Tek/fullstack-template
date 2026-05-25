import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { stateMaster } from '../../../region/infrastructure/persistence/state-master.schema';
import type {
	BusinessProfileReturnPreferenceRepositoryPort,
	NewBusinessProfileReturnPreferenceProps,
	ReturnPreferenceWithJoins,
	UpdateReturnPreferenceProps,
} from '../../application/ports/out/business-profile-return-preference-repository.port';
import { address } from './address.schema';
import { businessProfileReturnPreference } from './business-profile-return-preference.schema';
import { officeMaster } from './office-master.schema';
import { returnTypeMaster } from './return-type-master.schema';

@Injectable()
export class DrizzleBusinessProfileReturnPreferenceRepositoryAdapter
	implements BusinessProfileReturnPreferenceRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async create(
		data: NewBusinessProfileReturnPreferenceProps,
	): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessProfileReturnPreference)
			.values({
				businessProfileId: data.businessProfileId,
				returnTypeId: data.returnTypeId,
				returnTo: data.returnTo ?? null,
				returnAddressId: data.returnAddressId ?? null,
				returnOfficeId: data.returnOfficeId ?? null,
				lockerMasterId: data.lockerMasterId ?? null,
				notes: data.notes ?? null,
			})
			.returning({ id: businessProfileReturnPreference.id });
		return { id: row.id };
	}

	async findByBusinessProfileId(
		businessProfileId: string,
	): Promise<ReturnPreferenceWithJoins | null> {
		const rows = await this.db
			.select({
				id: businessProfileReturnPreference.id,
				returnTypeId: businessProfileReturnPreference.returnTypeId,
				returnTypeLegacyId: returnTypeMaster.legacyId,
				returnTypeName: returnTypeMaster.name,
				returnTo: businessProfileReturnPreference.returnTo,
				returnAddressId: businessProfileReturnPreference.returnAddressId,
				addressLine: address.addressLine1,
				cityName: cityMaster.name,
				stateName: stateMaster.name,
				returnOfficeId: businessProfileReturnPreference.returnOfficeId,
				officeName: officeMaster.name,
			})
			.from(businessProfileReturnPreference)
			.innerJoin(
				returnTypeMaster,
				eq(businessProfileReturnPreference.returnTypeId, returnTypeMaster.id),
			)
			.leftJoin(
				address,
				eq(businessProfileReturnPreference.returnAddressId, address.id),
			)
			.leftJoin(cityMaster, eq(address.cityId, cityMaster.id))
			.leftJoin(stateMaster, eq(address.stateId, stateMaster.id))
			.leftJoin(
				officeMaster,
				eq(businessProfileReturnPreference.returnOfficeId, officeMaster.id),
			)
			.where(
				eq(
					businessProfileReturnPreference.businessProfileId,
					businessProfileId,
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	async updateByBusinessProfileId(
		businessProfileId: string,
		data: UpdateReturnPreferenceProps,
	): Promise<void> {
		await this.db
			.update(businessProfileReturnPreference)
			.set({
				returnTypeId: data.returnTypeId,
				returnTo: data.returnTo,
				returnAddressId: data.returnAddressId,
				returnOfficeId: data.returnOfficeId,
			})
			.where(
				eq(
					businessProfileReturnPreference.businessProfileId,
					businessProfileId,
				),
			);
	}
}
