import { Injectable } from '@nestjs/common';
import type { TProfileMeOutput } from '@zoom/schemas';
import { GetProfileMeUseCasePort } from '../ports/in/get-profile-me.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { PendingInvitationReaderPort } from '../ports/out/pending-invitation-reader.port';

@Injectable()
export class GetProfileMeUseCase implements GetProfileMeUseCasePort {
	constructor(
		private readonly businessProfileRepo: BusinessProfileRepositoryPort,
		private readonly pendingInvitationReader: PendingInvitationReaderPort,
	) {}

	async execute(userId: string): Promise<TProfileMeOutput> {
		const profile = await this.businessProfileRepo.findProfileByUserId(userId);

		if (!profile) {
			return {
				onboardingComplete: false,
				businessAccountId: null,
				pendingInvitation: null,
			};
		}

		if (profile.status === 'active') {
			return {
				onboardingComplete: true,
				businessAccountId: profile.businessAccountId,
				pendingInvitation: null,
			};
		}

		if (profile.status === 'invited') {
			const invitation =
				await this.pendingInvitationReader.findPendingByProfileId(profile.id);
			return {
				onboardingComplete: false,
				businessAccountId: null,
				pendingInvitation: invitation,
			};
		}

		return {
			onboardingComplete: false,
			businessAccountId: null,
			pendingInvitation: null,
		};
	}
}
