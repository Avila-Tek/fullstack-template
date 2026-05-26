import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import {
	type ForceRevokeSessionsCommand,
	type ForceRevokeSessionsResult,
	ForceRevokeSessionsUseCasePort,
} from '../ports/in/force-revoke-sessions.use-case.port';
import { ForceRevokeUnitOfWorkPort } from '../ports/out/force-revoke-unit-of-work.port';
import { SecurityNotificationPort } from '../ports/out/security-notification.port';
import { UserRepositoryPort } from '../ports/out/user-repository.port';

@Injectable()
export class ForceRevokeSessionsUseCase
	implements ForceRevokeSessionsUseCasePort
{
	constructor(
		private readonly userRepo: UserRepositoryPort,
		private readonly unitOfWork: ForceRevokeUnitOfWorkPort,
		private readonly notification: SecurityNotificationPort,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async execute(
		command: ForceRevokeSessionsCommand,
	): Promise<ForceRevokeSessionsResult> {
		const { targetUserId, platformAdminUserId, reason, ipAddress, userAgent } =
			command;

		const user = await this.userRepo.findById(targetUserId);
		if (!user) {
			this.logger.warn(
				{
					event: 'auth.admin.force_revoke_error',
					targetUserId,
					errorCode: 'AUTH_USER_NOT_FOUND',
				},
				'Target user not found for session revocation',
			);
			return {
				success: false,
				error: new UserNotFoundException({ targetUserId }),
			};
		}

		const result = await this.unitOfWork.run(async (repos) => {
			const sessionsRevokedCount =
				await repos.session.revokeAllForUser(targetUserId);

			await repos.user.updateSessionInvalidBefore(targetUserId, new Date());

			const existingTwoFactor =
				await repos.twoFactor.findEnabledByUserId(targetUserId);
			let twoFactorForced = false;

			if (!existingTwoFactor) {
				await repos.twoFactor.forceEnableEmail(targetUserId);
				await repos.user.updateTwoFactorEnabled(targetUserId, true);
				twoFactorForced = true;

				await repos.auditLog.log({
					eventType: 'admin_session_revoke_2fa_forced',
					platformAdminUserId,
					targetUserId,
					ipAddress,
					userAgent,
					details: { method: 'email' },
				});
			}

			await repos.auditLog.log({
				eventType: 'admin_session_revoked',
				platformAdminUserId,
				targetUserId,
				ipAddress,
				userAgent,
				details: {
					sessionsRevokedCount,
					twoFactorForced,
					...(reason !== undefined ? { reason } : {}),
				},
			});

			return {
				userId: targetUserId,
				sessionsRevokedCount,
				sessionInvalidBeforeUpdated: true as const,
				twoFactorForced,
			};
		});

		this.notification
			.sendSessionRevokedNotification(
				targetUserId,
				user.email.value,
				result.twoFactorForced,
			)
			.catch((err) => {
				this.logger.error(
					{
						event: 'auth.admin.force_revoke_notification_failed',
						targetUserId,
						error: err instanceof Error ? err.message : String(err),
					},
					'Post-revocation notification failed',
				);
			});

		this.logger.info(
			{
				event: 'auth.admin.force_revoke_success',
				platformAdminUserId,
				targetUserId,
				sessionsRevokedCount: result.sessionsRevokedCount,
				twoFactorForced: result.twoFactorForced,
			},
			'Admin force session revocation completed',
		);

		return { success: true, data: result };
	}
}
