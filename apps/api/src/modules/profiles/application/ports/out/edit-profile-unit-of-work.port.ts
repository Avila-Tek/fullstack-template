import type { BusinessProfilePermissionRepositoryPort } from '../../../../invitations/application/ports/out/business-profile-permission-repository.port';
import type { BusinessProfileServiceRepositoryPort } from '../../../../invitations/application/ports/out/business-profile-service-repository.port';
import type { AddressRepositoryPort } from './address-repository.port';
import type { BusinessAccountRepositoryPort } from './business-account-repository.port';
import type { BusinessProfileRepositoryPort } from './business-profile-repository.port';

export interface EditProfileRepos {
	address: AddressRepositoryPort;
	businessAccount: BusinessAccountRepositoryPort;
	businessProfile: BusinessProfileRepositoryPort;
	businessProfileService: BusinessProfileServiceRepositoryPort;
	businessProfilePermission: BusinessProfilePermissionRepositoryPort;
}

export abstract class EditProfileUnitOfWorkPort {
	abstract run<T>(work: (repos: EditProfileRepos) => Promise<T>): Promise<T>;
}
