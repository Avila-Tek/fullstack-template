import type { BusinessProfileRepositoryPort } from '../../../../profiles/application/ports/out/business-profile-repository.port';
import type { InvitationRepositoryPort } from './invitation-repository.port';

export interface RejectionRepos {
	invite: Pick<InvitationRepositoryPort, 'reject'>;
	businessProfile: Pick<
		BusinessProfileRepositoryPort,
		'softDeleteByInviteRejection'
	>;
}

export abstract class InvitationRejectionUnitOfWorkPort {
	abstract run(fn: (repos: RejectionRepos) => Promise<void>): Promise<void>;
}
