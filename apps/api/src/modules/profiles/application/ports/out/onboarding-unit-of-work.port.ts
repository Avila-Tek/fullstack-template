import type { AddressRepositoryPort } from './address-repository.port';
import type { BusinessAccountRepositoryPort } from './business-account-repository.port';
import type { BusinessProfileRepositoryPort } from './business-profile-repository.port';
import type { BusinessProfileReturnPreferenceRepositoryPort } from './business-profile-return-preference-repository.port';
import type { BusinessProfileSettingsRepositoryPort } from './business-profile-settings-repository.port';
import type { NotificationPreferenceRepositoryPort } from './notification-preference-repository.port';

export interface OnboardingRepos {
	address: AddressRepositoryPort;
	businessAccount: BusinessAccountRepositoryPort;
	businessProfile: BusinessProfileRepositoryPort;
	businessProfileSettings: BusinessProfileSettingsRepositoryPort;
	businessProfileReturnPreference: BusinessProfileReturnPreferenceRepositoryPort;
	notificationPreference: Pick<NotificationPreferenceRepositoryPort, 'create'>;
}

export abstract class OnboardingUnitOfWorkPort {
	abstract run<T>(work: (repos: OnboardingRepos) => Promise<T>): Promise<T>;
}
