import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { InvalidPasswordException } from '../../domain/exceptions/invalid-password.exception';
import { NoPasswordAccountException } from '../../domain/exceptions/no-password-account.exception';
import { PasswordReuseException } from '../../domain/exceptions/password-reuse.exception';
import { Password } from '../../domain/value-objects/password.value-object';
import {
	type ChangePasswordResult,
	ChangePasswordUseCasePort,
} from '../ports/in/change-password.use-case.port';
import { AccountRepositoryPort } from '../ports/out/account-repository.port';
import { PasswordHashServicePort } from '../ports/out/password-hash-service.port';
import { PasswordHistoryRepositoryPort } from '../ports/out/password-history-repository.port';
import { SessionRepositoryPort } from '../ports/out/session-repository.port';

const PASSWORD_HISTORY_LIMIT = 5;

// Spec §18: authenticated change-password flow — verifies current password,
// enforces complexity + history, updates credential account, and revokes all sessions.
@Injectable()
export class ChangePasswordUseCase implements ChangePasswordUseCasePort {
	constructor(
		private readonly accountRepo: AccountRepositoryPort,
		private readonly sessionRepo: SessionRepositoryPort,
		private readonly passwordHistoryRepo: PasswordHistoryRepositoryPort,
		private readonly hashService: PasswordHashServicePort,
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async execute(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<ChangePasswordResult> {
		const credentialAccount =
			await this.accountRepo.findCredentialAccount(userId);
		if (!credentialAccount?.passwordHash) {
			this.logger.warn(
				{
					event: 'identity.password.change_error',
					userId,
					errorCode: 'IDENTITY_NO_PASSWORD_ACCOUNT',
				},
				'No credential account found',
			);
			return { success: false, error: new NoPasswordAccountException() };
		}

		const isCurrentValid = await this.hashService.verify(
			credentialAccount.passwordHash,
			currentPassword,
		);
		if (!isCurrentValid) {
			this.logger.warn(
				{
					event: 'identity.password.change_error',
					userId,
					errorCode: 'IDENTITY_INVALID_CREDENTIALS',
				},
				'Current password is incorrect',
			);
			return { success: false, error: new InvalidCredentialsException() };
		}

		try {
			Password.create(newPassword);
		} catch {
			this.logger.warn(
				{
					event: 'identity.password.change_error',
					userId,
					errorCode: 'IDENTITY_INVALID_PASSWORD',
				},
				'New password failed complexity validation',
			);
			return { success: false, error: new InvalidPasswordException() };
		}

		// Spec §18: reject if new password matches any of the last 5 hashes
		const recentHashes = await this.passwordHistoryRepo.findRecentHashes(
			userId,
			PASSWORD_HISTORY_LIMIT,
		);
		for (const hash of recentHashes) {
			if (await this.hashService.verify(hash, newPassword)) {
				this.logger.warn(
					{
						event: 'identity.password.change_error',
						userId,
						errorCode: 'IDENTITY_PASSWORD_REUSE',
					},
					'New password matches recent history',
				);
				return { success: false, error: new PasswordReuseException() };
			}
		}

		const newHash = await this.hashService.hash(newPassword);

		await this.accountRepo.updatePassword(credentialAccount.id, newHash);
		const revokedCount = await this.sessionRepo.revokeAllForUser(userId);
		await this.passwordHistoryRepo.append(userId, newHash);

		this.logger.info(
			{ event: 'identity.password.changed', userId },
			'Password changed successfully',
		);
		this.logger.info(
			{ event: 'identity.sessions.revoked', userId, count: revokedCount },
			'Sessions revoked after password change',
		);

		return { success: true, data: null };
	}
}
