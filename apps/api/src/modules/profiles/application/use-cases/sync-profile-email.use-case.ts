import { Inject, Injectable } from '@nestjs/common';
import type {
	TSyncProfileEmailCommand,
	TSyncProfileEmailOutput,
} from '@zoom/schemas';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { SyncProfileEmailUseCasePort } from '../ports/in/sync-profile-email.use-case.port';
import { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';

@Injectable()
export class SyncProfileEmailUseCase implements SyncProfileEmailUseCasePort {
	constructor(
		@Inject(BusinessProfileRepositoryPort)
		private readonly profileRepo: BusinessProfileRepositoryPort,
	) {}

	async execute(
		cmd: TSyncProfileEmailCommand,
	): Promise<TSyncProfileEmailOutput> {
		const profile = await this.profileRepo.findCurrentUserByUserId(cmd.userId);
		if (!profile) {
			throw new BusinessProfileNotFoundException({ userId: cmd.userId });
		}
		if (profile.email === cmd.email) {
			return { updated: false };
		}
		await this.profileRepo.updateEmail(cmd.userId, cmd.email);
		return { updated: true };
	}
}
