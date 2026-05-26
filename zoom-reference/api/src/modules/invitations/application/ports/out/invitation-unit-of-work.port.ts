import type { AddressRepositoryPort } from '../../../../profiles/application/ports/out/address-repository.port';
import type { BusinessProfileRepositoryPort } from '../../../../profiles/application/ports/out/business-profile-repository.port';
import type { BusinessProfilePermissionRepositoryPort } from './business-profile-permission-repository.port';
import type { BusinessProfileServiceRepositoryPort } from './business-profile-service-repository.port';
import type { InvitationRepositoryPort } from './invitation-repository.port';

export interface InvitationRepos {
	address: AddressRepositoryPort;
	businessProfile: BusinessProfileRepositoryPort;
	invitation: InvitationRepositoryPort;
	businessProfileService: BusinessProfileServiceRepositoryPort;
	businessProfilePermission: BusinessProfilePermissionRepositoryPort;
}

export abstract class InvitationUnitOfWorkPort {
	abstract run<T>(work: (repos: InvitationRepos) => Promise<T>): Promise<T>;
}
