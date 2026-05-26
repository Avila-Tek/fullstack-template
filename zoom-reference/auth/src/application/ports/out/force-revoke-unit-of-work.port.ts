import type { SessionRepositoryPort } from './session-repository.port';
import type { SystemAuditLogPort } from './system-audit-log.port';
import type { TwoFactorRepositoryPort } from './two-factor-repository.port';
import type { UserRepositoryPort } from './user-repository.port';

export interface ForceRevokeRepos {
	session: Pick<SessionRepositoryPort, 'revokeAllForUser'>;
	user: Pick<
		UserRepositoryPort,
		'updateSessionInvalidBefore' | 'updateTwoFactorEnabled'
	>;
	twoFactor: Pick<
		TwoFactorRepositoryPort,
		'findEnabledByUserId' | 'forceEnableEmail'
	>;
	auditLog: Pick<SystemAuditLogPort, 'log'>;
}

export abstract class ForceRevokeUnitOfWorkPort {
	abstract run<T>(work: (repos: ForceRevokeRepos) => Promise<T>): Promise<T>;
}
