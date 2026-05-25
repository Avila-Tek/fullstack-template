import { Injectable } from '@nestjs/common';
import { ZoomSmsClient } from '@zoom/providers';
import type { SmsServicePort } from '../../application/ports/out/sms-service.port';
import { SmsDeliveryException } from '../../domain/exceptions/sms-delivery.exception';
import { env } from '../../env';
import { ZoomAuthService } from '../zoom/zoom-auth.service';

@Injectable()
export class ZoomSmsAdapter implements SmsServicePort {
	private readonly smsClient: ZoomSmsClient;

	constructor(authService: ZoomAuthService) {
		this.smsClient = new ZoomSmsClient(authService.client, {
			smsApiUrl: env.ZOOM_SMS_API_URL,
			smsSenderId: env.ZOOM_SMS_SENDER_ID,
			timeoutMs: env.ZOOM_API_TIMEOUT_MS,
			retryMax: env.ZOOM_API_RETRY_MAX,
			retryBackoffMs: env.ZOOM_API_RETRY_BACKOFF_MS,
		});
	}

	async sendTwoFactorOtpSms(to: string, otp: string): Promise<void> {
		const minutes = Math.ceil(env.OTP_TTL_SECONDS / 60);
		try {
			await this.smsClient.sendSms(
				to,
				`Tu código de verificación es: ${otp}. Válido por ${minutes} minutos. No lo compartas con nadie.`,
			);
		} catch (cause) {
			throw new SmsDeliveryException({
				step: 'send',
				reason: 'provider_error',
				cause,
			});
		}
	}

	async sendPhoneVerificationOtpSms(to: string, otp: string): Promise<void> {
		const minutes = Math.ceil(env.OTP_TTL_SECONDS / 60);
		try {
			await this.smsClient.sendSms(
				to,
				`Tu código de verificación de número telefónico es: ${otp}. Válido por ${minutes} minutos.`,
			);
		} catch (cause) {
			throw new SmsDeliveryException({
				step: 'send',
				reason: 'provider_error',
				cause,
			});
		}
	}
}
