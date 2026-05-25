import { Inject, Injectable } from '@nestjs/common';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { NotificationPreferenceNotFoundException } from '../../domain/exceptions/notification-preference-not-found.exception';
import { GetNotificationPreferenceUseCasePort } from '../ports/in/get-notification-preference.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { NotificationPreferenceRepositoryPort } from '../ports/out/notification-preference-repository.port';

@Injectable()
export class GetNotificationPreferenceUseCase
	implements GetNotificationPreferenceUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(NotificationPreferenceRepositoryPort)
		private readonly notifRepo: NotificationPreferenceRepositoryPort,
	) {}

	async execute(userId: string): Promise<{ preference: 'all' | 'none' }> {
		const profile = await this.profileRepo.findCurrentUserByUserId(userId);
		if (!profile) throw new BusinessProfileNotFoundException({ userId });

		const row = await this.notifRepo.findByBusinessProfileId(
			profile.businessProfileId,
		);
		if (!row)
			throw new NotificationPreferenceNotFoundException({
				businessProfileId: profile.businessProfileId,
			});

		return { preference: row.emailEnabled ? 'all' : 'none' };
	}
}
