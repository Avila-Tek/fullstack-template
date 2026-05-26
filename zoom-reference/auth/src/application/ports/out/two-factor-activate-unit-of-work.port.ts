import type { TwoFactorAuditLogRepositoryPort } from './two-factor-audit-log-repository.port';
import type { TwoFactorRepositoryPort } from './two-factor-repository.port';

export interface TwoFactorActivateRepos {
	twoFactor: Pick<
		TwoFactorRepositoryPort,
		'findEnabledByUserId' | 'insert' | 'deactivate'
	>;
	auditLog: Pick<TwoFactorAuditLogRepositoryPort, 'insertEvent'>;
}

export abstract class TwoFactorActivateUnitOfWorkPort {
	abstract run<T>(
		work: (repos: TwoFactorActivateRepos) => Promise<T>,
	): Promise<T>;
}
