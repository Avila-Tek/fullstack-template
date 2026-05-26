import { describe, expect, it, vi } from 'vitest';

const mockEnv = vi.hoisted(() => ({
	OTEL_SERVICE_NAME: undefined as string | undefined,
	NODE_ENV: 'test' as string,
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

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

import { sentryScopeMiddleware } from '../../../src/infrastructure/telemetry/sentry-scope.middleware.js';

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
		mockEnv.OTEL_SERVICE_NAME = 'zoom-auth';
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('service', 'zoom-auth');
		mockEnv.OTEL_SERVICE_NAME = undefined;
	});

	it('sets service tag to "unknown" when OTEL_SERVICE_NAME is absent', () => {
		mockEnv.OTEL_SERVICE_NAME = undefined;
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('service', 'unknown');
	});

	it('sets env tag from NODE_ENV', () => {
		mockEnv.NODE_ENV = 'production';
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		expect(mockSetTag).toHaveBeenCalledWith('env', 'production');
		mockEnv.NODE_ENV = 'test';
	});

	it('sets http_request context with method, url, params — no body', () => {
		const req = makeReq({
			method: 'POST',
			url: '/api/v1/auth/sign-in',
			params: {},
		});
		sentryScopeMiddleware(req, res, vi.fn());
		expect(mockSetContext).toHaveBeenCalledWith(
			'http_request',
			expect.objectContaining({
				method: 'POST',
				url: '/api/v1/auth/sign-in',
				params: {},
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

	it('sets correlation_id tag when x-correlation-id header is present', () => {
		mockSetTag.mockClear();
		sentryScopeMiddleware(
			makeReq({ headers: { 'x-correlation-id': 'abc-123-def' } }),
			res,
			vi.fn(),
		);
		expect(mockSetTag).toHaveBeenCalledWith('correlation_id', 'abc-123-def');
	});

	it('omits correlation_id tag when x-correlation-id header is missing', () => {
		mockSetTag.mockClear();
		sentryScopeMiddleware(makeReq(), res, vi.fn());
		const cidCalls = mockSetTag.mock.calls.filter(
			([key]) => key === 'correlation_id',
		);
		expect(cidCalls).toHaveLength(0);
	});

	it('omits correlation_id tag when x-correlation-id header is empty', () => {
		mockSetTag.mockClear();
		sentryScopeMiddleware(
			makeReq({ headers: { 'x-correlation-id': '' } }),
			res,
			vi.fn(),
		);
		const cidCalls = mockSetTag.mock.calls.filter(
			([key]) => key === 'correlation_id',
		);
		expect(cidCalls).toHaveLength(0);
	});

	it('truncates correlation_id tag value at 64 characters', () => {
		mockSetTag.mockClear();
		const longCid = 'a'.repeat(200);
		sentryScopeMiddleware(
			makeReq({ headers: { 'x-correlation-id': longCid } }),
			res,
			vi.fn(),
		);
		expect(mockSetTag).toHaveBeenCalledWith('correlation_id', 'a'.repeat(64));
	});

	it('reads first value when x-correlation-id arrives as an array', () => {
		mockSetTag.mockClear();
		sentryScopeMiddleware(
			makeReq({ headers: { 'x-correlation-id': ['first-cid', 'second-cid'] } }),
			res,
			vi.fn(),
		);
		expect(mockSetTag).toHaveBeenCalledWith('correlation_id', 'first-cid');
	});
});
