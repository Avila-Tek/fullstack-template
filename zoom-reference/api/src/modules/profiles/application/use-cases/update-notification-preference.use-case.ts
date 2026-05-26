import { Inject, Injectable } from '@nestjs/common';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { UpdateNotificationPreferenceUseCasePort } from '../ports/in/update-notification-preference.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { NotificationPreferenceRepositoryPort } from '../ports/out/notification-preference-repository.port';

@Injectable()
export class UpdateNotificationPreferenceUseCase
	implements UpdateNotificationPreferenceUseCasePort
{
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
		@Inject(NotificationPreferenceRepositoryPort)
		private readonly notifRepo: NotificationPreferenceRepositoryPort,
	) {}

	async execute(
		userId: string,
		preference: 'all' | 'none',
	): Promise<{ preference: 'all' | 'none' }> {
		const profile = await this.profileRepo.findCurrentUserByUserId(userId);
		if (!profile) throw new BusinessProfileNotFoundException({ userId });

		await this.notifRepo.upsert(
			profile.businessProfileId,
			preference === 'all',
		);
		return { preference };
	}
}
