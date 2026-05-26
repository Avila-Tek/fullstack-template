import { Injectable } from '@nestjs/common';
import { ZoomEmailClient } from '@zoom/providers';
import { env } from '../../../env';
import { EmailServicePort } from '../application/ports/out/email.service.port';
import { EmailTemplates } from './email-templates';
import { ZoomAuthService } from './zoom-auth.service';

@Injectable()
export class ZoomEmailAdapter implements EmailServicePort {
	private readonly emailClient: ZoomEmailClient;

	constructor(authService: ZoomAuthService) {
		this.emailClient = new ZoomEmailClient(authService.client, {
			emailApiUrl: env.ZOOM_EMAIL_API_URL,
			emailSenderId: env.ZOOM_EMAIL_SENDER_ID,
			timeoutMs: env.ZOOM_API_TIMEOUT_MS,
			retryMax: env.ZOOM_API_RETRY_MAX,
			retryBackoffMs: env.ZOOM_API_RETRY_BACKOFF_MS,
		});
	}

	async sendInvitationEmail(to: string, plaintextToken: string): Promise<void> {
		const invitationUrl = `${env.CLIENT_BASE_URL}/invite/${encodeURIComponent(plaintextToken)}`;
		await this.emailClient.sendEmail(
			to,
			'Tienes una invitación',
			EmailTemplates.invitationEmail(invitationUrl),
		);
	}

	async sendCollaboratorSuspendedEmail(to: string): Promise<void> {
		await this.emailClient.sendEmail(
			to,
			'Tu cuenta ha sido suspendida',
			EmailTemplates.collaboratorSuspendedEmail(),
		);
	}

	async sendCollaboratorReactivatedEmail(to: string): Promise<void> {
		await this.emailClient.sendEmail(
			to,
			'Tu cuenta ha sido reactivada',
			EmailTemplates.collaboratorReactivatedEmail(),
		);
	}

	async sendCollaboratorRemovedEmail(to: string): Promise<void> {
		await this.emailClient.sendEmail(
			to,
			'Fuiste removido de la organización',
			EmailTemplates.collaboratorRemovedEmail(),
		);
	}
}
