import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type {
	BusinessProfileSettingsRepositoryPort,
	NewBusinessProfileSettingsProps,
} from '../../application/ports/out/business-profile-settings-repository.port';
import { businessProfileSettings } from './business-profile-settings.schema';

@Injectable()
export class DrizzleBusinessProfileSettingsRepositoryAdapter
	implements BusinessProfileSettingsRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async create(data: NewBusinessProfileSettingsProps): Promise<{ id: string }> {
		const [row] = await this.db
			.insert(businessProfileSettings)
			.values({
				businessProfileId: data.businessProfileId,
				internationalMaritimeWeightUnitId:
					data.internationalMaritimeWeightUnitId,
				internationalMaritimeDimensionUnitId:
					data.internationalMaritimeDimensionUnitId,
			})
			.returning({ id: businessProfileSettings.id });
		return { id: row.id };
	}
}
