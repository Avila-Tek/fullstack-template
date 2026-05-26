import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: {
		error: vi.fn(),
	},
}));

import { APIError } from 'better-auth';
import { PhoneNumberSendOtpHook } from '../../../src/infrastructure/hooks/phone-number-send-otp.hook';

function makeSmsService() {
	return { sendPhoneVerificationOtpSms: vi.fn().mockResolvedValue(undefined) };
}

function makeHook(smsService = makeSmsService()) {
	return { hook: new PhoneNumberSendOtpHook(smsService as never), smsService };
}

function makeCtx() {
	return { context: {} as Record<string, unknown> };
}

describe('PhoneNumberSendOtpHook', () => {
	describe('before()', () => {
		it('injects sendPhoneOTP into ctx.context', () => {
			const { hook } = makeHook();
			const ctx = makeCtx();

			hook.before(ctx as never);

			expect(typeof ctx.context.sendPhoneOTP).toBe('function');
		});

		it('sendPhoneOTP delegates to smsService.sendPhoneVerificationOtpSms', async () => {
			const { hook, smsService } = makeHook();
			const ctx = makeCtx();

			hook.before(ctx as never);

			await (
				ctx.context.sendPhoneOTP as (
					phone: string,
					otp: string,
				) => Promise<void>
			)('+584141234567', '654321');

			expect(smsService.sendPhoneVerificationOtpSms).toHaveBeenCalledWith(
				'+584141234567',
				'654321',
			);
		});

		it('throws APIError 500 when SMS delivery fails', async () => {
			const smsService = {
				sendPhoneVerificationOtpSms: vi
					.fn()
					.mockRejectedValue(new Error('SMS gateway unavailable')),
			};
			const { hook } = makeHook(smsService);
			const ctx = makeCtx();

			hook.before(ctx as never);

			const thrown = await (
				ctx.context.sendPhoneOTP as (
					phone: string,
					otp: string,
				) => Promise<void>
			)('+584141234567', '654321').catch((e: unknown) => e);

			expect(thrown).toBeInstanceOf(APIError);
			expect((thrown as APIError).status).toBe(500);
		});

		it('does not swallow delivery errors silently', async () => {
			const smsService = {
				sendPhoneVerificationOtpSms: vi
					.fn()
					.mockRejectedValue(new Error('timeout')),
			};
			const { hook } = makeHook(smsService);
			const ctx = makeCtx();

			hook.before(ctx as never);

			await expect(
				(
					ctx.context.sendPhoneOTP as (
						phone: string,
						otp: string,
					) => Promise<void>
				)('+584141234567', '000000'),
			).rejects.toBeInstanceOf(APIError);
		});
	});
});
