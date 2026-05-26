import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type { NotificationPreferenceRepositoryPort } from '../../application/ports/out/notification-preference-repository.port';
import { businessProfileNotificationPreference } from './business-profile-notification-preference.schema';

@Injectable()
export class DrizzleNotificationPreferenceRepositoryAdapter
	implements NotificationPreferenceRepositoryPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async create(businessProfileId: string): Promise<void> {
		await this.db
			.insert(businessProfileNotificationPreference)
			.values({ businessProfileId });
	}

	async findByBusinessProfileId(
		businessProfileId: string,
	): Promise<{ emailEnabled: boolean } | null> {
		const [row] = await this.db
			.select({
				emailEnabled: businessProfileNotificationPreference.emailEnabled,
			})
			.from(businessProfileNotificationPreference)
			.where(
				eq(
					businessProfileNotificationPreference.businessProfileId,
					businessProfileId,
				),
			)
			.limit(1);
		return row ?? null;
	}

	async upsert(
		businessProfileId: string,
		emailEnabled: boolean,
	): Promise<void> {
		await this.db
			.insert(businessProfileNotificationPreference)
			.values({ businessProfileId, emailEnabled })
			.onConflictDoUpdate({
				target: businessProfileNotificationPreference.businessProfileId,
				set: {
					emailEnabled,
					updatedAt: sql`now()`,
				},
			});
	}
}
