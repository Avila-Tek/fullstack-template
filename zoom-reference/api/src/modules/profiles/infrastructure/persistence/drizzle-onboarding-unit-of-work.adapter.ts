import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import type { OnboardingRepos } from '../../application/ports/out/onboarding-unit-of-work.port';
import { OnboardingUnitOfWorkPort } from '../../application/ports/out/onboarding-unit-of-work.port';
import { DrizzleAddressRepositoryAdapter } from './drizzle-address-repository.adapter';
import { DrizzleBusinessAccountRepositoryAdapter } from './drizzle-business-account-repository.adapter';
import { DrizzleBusinessProfileRepositoryAdapter } from './drizzle-business-profile-repository.adapter';
import { DrizzleBusinessProfileReturnPreferenceRepositoryAdapter } from './drizzle-business-profile-return-preference-repository.adapter';
import { DrizzleBusinessProfileSettingsRepositoryAdapter } from './drizzle-business-profile-settings-repository.adapter';
import { DrizzleNotificationPreferenceRepositoryAdapter } from './drizzle-notification-preference-repository.adapter';

@Injectable()
export class DrizzleOnboardingUnitOfWorkAdapter
	implements OnboardingUnitOfWorkPort
{
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async run<T>(work: (repos: OnboardingRepos) => Promise<T>): Promise<T> {
		return this.db.transaction(async (tx) => {
			return work({
				address: new DrizzleAddressRepositoryAdapter(tx),
				businessAccount: new DrizzleBusinessAccountRepositoryAdapter(tx),
				businessProfile: new DrizzleBusinessProfileRepositoryAdapter(tx),
				businessProfileSettings:
					new DrizzleBusinessProfileSettingsRepositoryAdapter(tx),
				businessProfileReturnPreference:
					new DrizzleBusinessProfileReturnPreferenceRepositoryAdapter(tx),
				notificationPreference:
					new DrizzleNotificationPreferenceRepositoryAdapter(tx),
			});
		});
	}
}
