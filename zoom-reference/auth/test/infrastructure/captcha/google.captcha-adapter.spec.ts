import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
	SKIP_CAPTCHA: false as boolean | undefined,
	RECAPTCHA_V3_SECRET_KEY: 'secret-v3',
	RECAPTCHA_V2_SECRET_KEY: 'secret-v2',
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

import type { CaptchaVerifyResult } from '../../../src/application/ports/out/captcha-service.port';
import { GoogleCaptchaAdapter } from '../../../src/infrastructure/captcha/google-captcha-adapter';

// Instantiate adapter for each test
async function loadAdapter(): Promise<{
	googleCaptchaService: {
		verify: (
			token: string,
			version: 'v3' | 'v2',
		) => Promise<CaptchaVerifyResult>;
	};
}> {
	return {
		googleCaptchaService: new GoogleCaptchaAdapter(),
	};
}

describe('GoogleCaptchaAdapter', () => {
	beforeEach(() => {
		mockEnv.SKIP_CAPTCHA = false;
		mockEnv.RECAPTCHA_V3_SECRET_KEY = 'secret-v3';
		mockEnv.RECAPTCHA_V2_SECRET_KEY = 'secret-v2';
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('SKIP_CAPTCHA bypass', () => {
		it('returns success without calling fetch when SKIP_CAPTCHA=true', async () => {
			mockEnv.SKIP_CAPTCHA = true;
			const fetchSpy = vi.spyOn(globalThis, 'fetch');
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('any-token', 'v3');

			expect(result).toEqual({ success: true });
			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});

	describe('v3 verification', () => {
		it('returns success with score when Google v3 score >= 0.5', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, score: 0.8 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v3', 'v3');

			expect(result).toEqual({ success: true, score: 0.8 });
		});

		it('returns success with score exactly at 0.5 boundary', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, score: 0.5 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v3', 'v3');

			expect(result).toEqual({ success: true, score: 0.5 });
		});

		it('returns challenge:v2 when score < 0.5', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, score: 0.3 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v3', 'v3');

			expect(result).toEqual({ success: false, challenge: 'v2' });
		});

		it('returns challenge:v2 when score is exactly below threshold (0.49)', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, score: 0.49 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v3', 'v3');

			expect(result).toEqual({ success: false, challenge: 'v2' });
		});

		it('returns failure when Google v3 response success=false', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: false, score: 0 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v3', 'v3');

			expect(result).toEqual({ success: false });
		});

		it('uses RECAPTCHA_V3_SECRET_KEY for v3 requests', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, score: 0.9 }), {
					status: 200,
				}),
			);
			const { googleCaptchaService } = await loadAdapter();

			await googleCaptchaService.verify('my-v3-token', 'v3');

			const calledUrl = fetchSpy.mock.calls[0][0] as string;
			expect(calledUrl).toContain('secret-v3');
			expect(calledUrl).toContain('my-v3-token');
		});
	});

	describe('v2 verification', () => {
		it('returns success when Google v2 response is success=true', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true }), { status: 200 }),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v2', 'v2');

			expect(result).toEqual({ success: true });
		});

		it('returns failure when Google v2 response is success=false', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ success: false }), { status: 200 }),
			);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token-v2', 'v2');

			expect(result).toEqual({ success: false });
		});

		it('uses RECAPTCHA_V2_SECRET_KEY for v2 requests', async () => {
			const fetchSpy = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(
					new Response(JSON.stringify({ success: true }), { status: 200 }),
				);
			const { googleCaptchaService } = await loadAdapter();

			await googleCaptchaService.verify('my-v2-token', 'v2');

			const calledUrl = fetchSpy.mock.calls[0][0] as string;
			expect(calledUrl).toContain('secret-v2');
			expect(calledUrl).toContain('my-v2-token');
		});
	});

	describe('network failure — fail closed', () => {
		it('returns { success: false, unavailable: true } and logs warning when fetch throws (Google unreachable)', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
				new Error('ECONNREFUSED'),
			);
			const stderrSpy = vi
				.spyOn(process.stderr, 'write')
				.mockImplementation(() => true);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token', 'v3');

			expect(result).toEqual({ success: false, unavailable: true });
			expect(stderrSpy).toHaveBeenCalledWith(
				expect.stringContaining('captcha_api_unavailable'),
			);
		});

		it('fails closed for v2 as well when network is down', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
				new Error('network error'),
			);
			vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
			const { googleCaptchaService } = await loadAdapter();

			const result = await googleCaptchaService.verify('token', 'v2');

			expect(result).toEqual({ success: false, unavailable: true });
		});
	});
});
