import type { AccountRepositoryPort } from './account-repository.port';
import type { SystemMembershipRepositoryPort } from './system-membership-repository.port';
import type { UserRepositoryPort } from './user-repository.port';

export interface GrantAccessRepos {
	user: Pick<UserRepositoryPort, 'createProvisioned'>;
	account: Pick<AccountRepositoryPort, 'createCredential'>;
	membership: Pick<SystemMembershipRepositoryPort, 'insertMembership'>;
}

export abstract class GrantAccessUnitOfWorkPort {
	abstract run<T>(work: (repos: GrantAccessRepos) => Promise<T>): Promise<T>;
}
