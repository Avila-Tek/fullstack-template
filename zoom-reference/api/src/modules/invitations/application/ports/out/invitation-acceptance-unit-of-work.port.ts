import type { BusinessProfileRepositoryPort } from '../../../../profiles/application/ports/out/business-profile-repository.port';
import type { InvitationRepositoryPort } from './invitation-repository.port';

export interface AcceptanceRepos {
	invite: Pick<InvitationRepositoryPort, 'accept'>;
	businessProfile: Pick<BusinessProfileRepositoryPort, 'activateByInvite'>;
}

export abstract class InvitationAcceptanceUnitOfWorkPort {
	abstract run(fn: (repos: AcceptanceRepos) => Promise<void>): Promise<void>;
}
