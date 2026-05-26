import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/env', () => ({
	env: {
		ZOOM_SMS_API_URL: 'https://zoom-api.test/sms',
		ZOOM_SMS_SENDER_ID: 'ZOOM',
		OTP_TTL_SECONDS: 300,
		ZOOM_API_TIMEOUT_MS: 5000,
		ZOOM_API_RETRY_MAX: 3,
		ZOOM_API_RETRY_BACKOFF_MS: 0,
	},
}));

import { ZoomSmsAdapter } from '../../../src/infrastructure/sms/zoom-sms.adapter';
import { ZoomAuthService } from '../../../src/infrastructure/zoom/zoom-auth.service';

const SUCCESS_SEND_RESPONSE = { codrespuesta: 'COD_000', mensaje: 'OK' };

// ZoomSmsAdapter delegates fetch logic to ZoomSmsClient (tested in
// packages/providers). These tests verify message formatting only.
function makeAuthService(token = 'tok-sms') {
	const client = {
		getToken: vi.fn().mockResolvedValue(token),
		invalidateToken: vi.fn(),
	};
	return { client } as unknown as ZoomAuthService;
}

function mockFetch(response: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		status,
		json: vi.fn().mockResolvedValue(response),
	});
}

describe('ZoomSmsAdapter', () => {
	let authService: ZoomAuthService;
	let adapter: ZoomSmsAdapter;

	beforeEach(() => {
		authService = makeAuthService();
		adapter = new ZoomSmsAdapter(authService);
		vi.stubGlobal('fetch', mockFetch(SUCCESS_SEND_RESPONSE));
	});

	describe('sendTwoFactorOtpSms()', () => {
		it('sends SMS to the correct phone number', async () => {
			await adapter.sendTwoFactorOtpSms('+584141234567', '123456');
			expect(fetch).toHaveBeenCalledOnce();
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.telefono).toBe('+584141234567');
		});

		it('includes the OTP code in the message', async () => {
			await adapter.sendTwoFactorOtpSms('+584141234567', '123456');
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			const once = Buffer.from(body.sms, 'base64').toString('utf8');
			const plain = Buffer.from(once, 'base64').toString('utf8');
			expect(plain).toContain('123456');
		});

		it('includes OTP_TTL in minutes in the message', async () => {
			await adapter.sendTwoFactorOtpSms('+584141234567', '123456');
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			const once = Buffer.from(body.sms, 'base64').toString('utf8');
			const plain = Buffer.from(once, 'base64').toString('utf8');
			expect(plain).toContain('5 minutos'); // OTP_TTL_SECONDS=300 → 5 min
		});
	});

	describe('sendPhoneVerificationOtpSms()', () => {
		it('sends SMS and includes the OTP code', async () => {
			await adapter.sendPhoneVerificationOtpSms('+584141234567', '654321');
			expect(fetch).toHaveBeenCalledOnce();
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			const once = Buffer.from(body.sms, 'base64').toString('utf8');
			const plain = Buffer.from(once, 'base64').toString('utf8');
			expect(plain).toContain('654321');
		});
	});
});
