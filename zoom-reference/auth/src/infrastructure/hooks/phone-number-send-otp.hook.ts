import { Injectable } from '@nestjs/common';
import {
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import { SmsServicePort } from '../../application/ports/out/sms-service.port';
import { auditLogger } from '../../shared/logger/audit-logger';

@Hook()
@Injectable()
export class PhoneNumberSendOtpHook {
	constructor(private readonly smsService: SmsServicePort) {}

	@BeforeHook('/phone-number/send-otp')
	before(ctx: AuthHookContext): void {
		ctx.context.sendPhoneOTP = async (
			phone: string,
			otp: string,
		): Promise<void> => {
			try {
				await this.smsService.sendPhoneVerificationOtpSms(phone, otp);
			} catch (err) {
				auditLogger.error(
					{
						event: 'phone_number.send_otp.sms_delivery_failed',
						errorName: (err as Error)?.constructor?.name,
					},
					'Phone verification OTP SMS delivery failed',
				);
				throw new APIError(500, { error: 'otp_delivery_failed' });
			}
		};
	}
}
