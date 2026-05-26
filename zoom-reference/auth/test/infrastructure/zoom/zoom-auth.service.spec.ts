import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/env', () => ({
	env: {
		ZOOM_AUTH_URL: 'https://zoom-api.test/auth',
		ZOOM_USER: 'test-user',
		ZOOM_PASSWORD: 'test-password',
		ZOOM_API_TIMEOUT_MS: 5000,
		ZOOM_API_RETRY_MAX: 3,
		ZOOM_API_RETRY_BACKOFF_MS: 0,
	},
}));

import { ZoomAuthService } from '../../../src/infrastructure/zoom/zoom-auth.service';

const SUCCESS_AUTH_RESPONSE = {
	codrespuesta: 'COD_000',
	mensaje: 'OK',
	entidadRespuesta: { token: 'tok-abc', expires_at: '2099-01-01T00:00:00Z' },
};

function mockFetch(response: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		status,
		json: vi.fn().mockResolvedValue(response),
	});
}

// ZoomAuthService is a thin @Injectable() wrapper around ZoomAuthClient.
// The core behaviour (retry, token caching, 401 handling) is tested in
// packages/providers/src/auth/zoom-auth.client.spec.ts.
// These tests verify that the wrapper correctly delegates to the client.
describe('ZoomAuthService', () => {
	let service: ZoomAuthService;

	beforeEach(() => {
		service = new ZoomAuthService();
		vi.stubGlobal('fetch', mockFetch(SUCCESS_AUTH_RESPONSE));
	});

	it('delegates getToken() to the underlying ZoomAuthClient', async () => {
		const token = await service.getToken();
		expect(token).toBe('tok-abc');
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('returns cached token on subsequent calls', async () => {
		await service.getToken();
		await service.getToken();
		expect(fetch).toHaveBeenCalledOnce();
	});

	it('invalidateToken() clears the cache so the next call re-authenticates', async () => {
		await service.getToken();
		service.invalidateToken();
		vi.stubGlobal(
			'fetch',
			mockFetch({
				...SUCCESS_AUTH_RESPONSE,
				entidadRespuesta: { token: 'tok-fresh', expires_at: '2099-01-01' },
			}),
		);
		const token = await service.getToken();
		expect(token).toBe('tok-fresh');
	});
});
