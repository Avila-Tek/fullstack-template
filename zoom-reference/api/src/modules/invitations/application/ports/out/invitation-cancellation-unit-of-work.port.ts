import type { BusinessProfileRepositoryPort } from '../../../../profiles/application/ports/out/business-profile-repository.port';
import type { InvitationRepositoryPort } from './invitation-repository.port';

export interface CancellationRepos {
	invite: Pick<InvitationRepositoryPort, 'cancel'>;
	businessProfile: Pick<
		BusinessProfileRepositoryPort,
		'softDeleteByInviteRejection'
	>;
}

export abstract class InvitationCancellationUnitOfWorkPort {
	abstract run(fn: (repos: CancellationRepos) => Promise<void>): Promise<void>;
}
