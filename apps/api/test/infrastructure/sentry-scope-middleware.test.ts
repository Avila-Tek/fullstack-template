import { describe, expect, it, vi } from 'vitest';

const { mockSetTag, mockSetContext, mockWithIsolationScope } = vi.hoisted(
	() => {
		const mockSetTag = vi.fn();
		const mockSetContext = vi.fn();
		const mockWithIsolationScope = vi.fn((cb: (scope: unknown) => void) =>
			cb({ setTag: mockSetTag, setContext: mockSetContext }),
		);
		return { mockSetTag, mockSetContext, mockWithIsolationScope };
	},
);

vi.mock('@sentry/nestjs', () => ({
	init: vi.fn(),
	withIsolationScope: mockWithIsolationScope,
}));

import { sentryScopeMiddleware } from '@/infrastructure/telemetry/sentry-scope.middleware';

function makeReq(overrides?: object) {
	return {
		method: 'GET',
		url: '/api/v1/health',
		params: {},
		headers: {},
		...overrides,
	};
}
const res = {};
const next = vi.fn();

describe('sentryScopeMiddleware', () => {
	it('calls next()', () => {
		sentryScopeMiddleware(makeReq(), res, next);
		expect(next).toHaveBeenCalled();
	});

	it('sets service tag from OTEL_SERVICE_NAME', () => {
		const original = process.env.OTEL_SERVICE_NAME;
		process.env.OTEL_SERVICE_NAME = 'zoom-api';
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('service', 'zoom-api');
		process.env.OTEL_SERVICE_NAME = original;
	});

	it('sets service tag to "unknown" when OTEL_SERVICE_NAME is absent', () => {
		const original = process.env.OTEL_SERVICE_NAME;
		delete process.env.OTEL_SERVICE_NAME;
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('service', 'unknown');
		process.env.OTEL_SERVICE_NAME = original;
	});

	it('sets env tag from NODE_ENV', () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('env', 'production');
		process.env.NODE_ENV = original;
	});

	it('sets http_request context with method, url, params — no body', () => {
		const req = makeReq({
			method: 'POST',
			url: '/api/v1/regions',
			params: { id: '1' },
		});
		sentryScopeMiddleware(req, res, vi.fn());
		expect(mockSetContext).toHaveBeenCalledWith(
			'http_request',
			expect.objectContaining({
				method: 'POST',
				url: '/api/v1/regions',
				params: { id: '1' },
			}),
		);
	});

	it('does not attach body to the http_request context', () => {
		const req = makeReq({ body: { password: 'secret' } });
		sentryScopeMiddleware(req, res, vi.fn());
		const [, ctx] = mockSetContext.mock.calls.at(-1) as [
			string,
			Record<string, unknown>,
		];
		expect(ctx).not.toHaveProperty('body');
	});
});
