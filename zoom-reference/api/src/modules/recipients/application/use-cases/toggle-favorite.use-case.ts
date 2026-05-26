import { Injectable } from '@nestjs/common';
import { recordApiEvent } from '../../../../shared/metrics/api-metrics';
import { RecipientNotFoundException } from '../../domain/exceptions/recipient-not-found.exception';
import { RecipientProfileNotFoundException } from '../../domain/exceptions/recipient-profile-not-found.exception';
import type {
	ToggleFavoriteCommand,
	ToggleFavoriteResult,
	ToggleFavoriteUseCasePort,
} from '../ports/in/toggle-favorite.use-case.port';
import { BusinessProfileLookupPort } from '../ports/out/business-profile-lookup.port';
import { RecipientRepositoryPort } from '../ports/out/recipient-repository.port';

@Injectable()
export class ToggleFavoriteUseCase implements ToggleFavoriteUseCasePort {
	constructor(
		private readonly recipientRepo: RecipientRepositoryPort,
		private readonly profileRepo: BusinessProfileLookupPort,
	) {}

	async execute(cmd: ToggleFavoriteCommand): Promise<ToggleFavoriteResult> {
		const profile = await this.profileRepo.findProfileByUserId(cmd.userId);
		if (!profile) {
			throw new RecipientProfileNotFoundException({ userId: cmd.userId });
		}

		const recipient = await this.recipientRepo.findByIdWithPredicate(
			cmd.recipientId,
			{
				businessAccountId: profile.businessAccountId,
				callerProfileId: profile.id,
				callerRole: profile.role,
				hasShareGuide: cmd.permissions.hasShareGuide,
				hasShareLocker: cmd.permissions.hasShareLocker,
			},
		);

		if (!recipient) {
			throw new RecipientNotFoundException({ recipientId: cmd.recipientId });
		}

		const result = await this.recipientRepo.updateStarred(
			cmd.recipientId,
			cmd.starred,
			profile.id,
		);

		recordApiEvent(
			cmd.starred ? 'recipient.favorite.added' : 'recipient.favorite.removed',
			{ module: 'recipients', outcome: 'success' },
		);

		return result;
	}
}
