import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
	SKIP_CAPTCHA: false as boolean | undefined,
	TURNSTILE_SECRET_KEY: 'ts-secret',
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

import type { CaptchaServicePort } from '../../../src/application/ports/out/captcha-service.port';
import { CloudflareCaptchaAdapter } from '../../../src/infrastructure/captcha/cloudflare-captcha-adapter';

const mockLogger = {
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
};

function makeAdapter(): CaptchaServicePort {
	return new CloudflareCaptchaAdapter(mockLogger);
}

describe('CloudflareCaptchaAdapter', () => {
	beforeEach(() => {
		mockEnv.SKIP_CAPTCHA = false;
		mockEnv.TURNSTILE_SECRET_KEY = 'ts-secret';
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('SKIP_CAPTCHA bypass', () => {
		it('returns success without calling fetch when SKIP_CAPTCHA=true', async () => {
			mockEnv.SKIP_CAPTCHA = true;
			const fetchSpy = vi.spyOn(globalThis, 'fetch');

			const result = await makeAdapter().verify('any-token');

			expect(result).toEqual({ success: true });
			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});

	describe('token verification', () => {
		it('returns success when Cloudflare responds with success=true', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 200 }),
			);

			const result = await makeAdapter().verify('valid-token');

			expect(result).toEqual({ success: true });
		});

		it('returns failure when Cloudflare responds with success=false', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						success: false,
						'error-codes': ['invalid-input-response'],
					}),
					{ status: 200 },
				),
			);

			const result = await makeAdapter().verify('invalid-token');

			expect(result).toEqual({ success: false });
		});

		it('sends TURNSTILE_SECRET_KEY and token as POST form body to Cloudflare', async () => {
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ success: true }), { status: 200 }),
				);

			await makeAdapter().verify('my-token');

			const [url, options] = fetchSpy.mock.calls[0] as [
				string,
				RequestInit & { body: URLSearchParams },
			];
			expect(url).toBe(
				'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			);
			expect(options.method).toBe('POST');
			const body = options.body as URLSearchParams;
			expect(body.get('secret')).toBe('ts-secret');
			expect(body.get('response')).toBe('my-token');
		});

		it('ignores version parameter — same endpoint used for v2 and v3 callers', async () => {
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValue(
					new Response(JSON.stringify({ success: true }), { status: 200 }),
				);

			await makeAdapter().verify('token');
			await makeAdapter().verify('token', 'v2');

			for (const call of fetchSpy.mock.calls) {
				expect(call[0]).toBe(
					'https://challenges.cloudflare.com/turnstile/v0/siteverify',
				);
			}
		});
	});

	describe('network failure — fail closed', () => {
		it('returns { success: false, unavailable: true } and logs warn when fetch throws', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
				new Error('ECONNREFUSED'),
			);

			const result = await makeAdapter().verify('token');

			expect(result).toEqual({ success: false, unavailable: true });
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.objectContaining({ event: 'captcha_api_unavailable' }),
				expect.any(String),
			);
		});

		it('fails closed for v2 callers as well', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
				new Error('network error'),
			);

			const result = await makeAdapter().verify('token', 'v2');

			expect(result).toEqual({ success: false, unavailable: true });
		});
	});
});
