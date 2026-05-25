import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import { EmailServicePort } from '../../application/ports/out/email-service.port';
import { SecurityNotificationPort } from '../../application/ports/out/security-notification.port';

@Injectable()
export class SecurityNotificationAdapter implements SecurityNotificationPort {
	constructor(
		private readonly emailService: EmailServicePort,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async sendSessionRevokedNotification(
		targetUserId: string,
		email: string,
		twoFactorForced: boolean,
	): Promise<void> {
		try {
			await this.emailService.sendSessionRevokedEmail(email, twoFactorForced);
		} catch (error) {
			this.logger.error(
				{
					event: 'notification.session_revoked.failed',
					targetUserId,
					error: error instanceof Error ? error.message : String(error),
				},
				'Failed to send session revocation notification email',
			);
		}
	}
}
