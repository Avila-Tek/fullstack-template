import { Injectable } from '@nestjs/common';
import { ZoomEmailClient } from '@zoom/providers';
import type {
	EmailServicePort,
	SendFailedLoginAlertEmailParams,
} from '../../application/ports/out/email-service.port';
import { EmailDeliveryException } from '../../domain/exceptions/email-delivery.exception';
import { env } from '../../env';
import { ZoomAuthService } from '../zoom/zoom-auth.service';
import { EmailTemplates } from './email-templates';

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

	private async sendEmail(
		to: string | string[],
		subject: string,
		htmlContent: string,
		priority = 3,
	): Promise<void> {
		try {
			await this.emailClient.sendEmail(to, subject, htmlContent, priority);
		} catch (cause) {
			throw new EmailDeliveryException({
				step: 'send',
				reason: 'provider_error',
				cause,
			});
		}
	}

	async sendVerificationEmail(to: string, url: string): Promise<void> {
		await this.sendEmail(
			to,
			'Activa tu cuenta',
			EmailTemplates.verificationEmail(url),
		);
	}

	async sendWelcomeEmail(to: string): Promise<void> {
		await this.sendEmail(
			to,
			'¡Bienvenido a Mi ZOOM!',
			EmailTemplates.welcomeEmail(env.CLIENT_URL),
		);
	}

	async sendPasswordResetEmail(to: string, url: string): Promise<void> {
		await this.sendEmail(
			to,
			'Restablece tu contraseña',
			EmailTemplates.passwordResetEmail(
				url,
				`${Math.round(env.PASSWORD_RESET_TOKEN_TTL_SECONDS / 3600)} hora(s)`,
			),
			1,
		);
	}

	async sendLoginAlertEmail(
		to: string,
		deviceName: string,
		ip: string,
		timestamp: Date,
		recoveryUrl: string,
	): Promise<void> {
		await this.sendEmail(
			to,
			'Nuevo inicio de sesión detectado',
			EmailTemplates.loginAlertEmail(deviceName, ip, timestamp, recoveryUrl),
			1,
		);
	}

	async sendEmailChangeVerificationEmail(
		to: string,
		verificationUrl: string,
	): Promise<void> {
		await this.sendEmail(
			to,
			'Confirma tu nuevo correo',
			EmailTemplates.emailChangeVerificationEmail(verificationUrl),
		);
	}

	async sendSessionRevokedEmail(
		to: string,
		twoFactorForced: boolean,
	): Promise<void> {
		await this.sendEmail(
			to,
			'Alerta de seguridad: sesiones terminadas',
			EmailTemplates.sessionRevokedEmail(twoFactorForced),
			1,
		);
	}

	async sendTwoFactorOtpEmail(to: string, otp: string): Promise<void> {
		await this.sendEmail(
			to,
			'Tu código de verificación',
			EmailTemplates.twoFactorOtpEmail(otp),
			1,
		);
	}

	async sendFailedLoginAlertEmail(
		to: string,
		params: SendFailedLoginAlertEmailParams,
	): Promise<void> {
		await this.sendEmail(
			to,
			'Intentos de inicio de sesión fallidos',
			EmailTemplates.failedLoginAlertEmail(params),
			1,
		);
	}
}

// ---------------------------------------------------------------------------
// Singleton for auth.ts hooks — runs outside the NestJS DI container.
// ZoomAuthService has no injected deps, so it's directly instantiable.
// ---------------------------------------------------------------------------
export const zoomEmailService = new ZoomEmailAdapter(new ZoomAuthService());
