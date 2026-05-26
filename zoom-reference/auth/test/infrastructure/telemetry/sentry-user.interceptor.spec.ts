import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

const { mockSetUser } = vi.hoisted(() => ({ mockSetUser: vi.fn() }));

vi.mock('@sentry/nestjs', () => ({
	getCurrentScope: () => ({ setUser: mockSetUser }),
}));

import { SentryUserInterceptor } from '../../../src/infrastructure/telemetry/sentry-user.interceptor';

function makeContext(request: object): ExecutionContext {
	return {
		switchToHttp: () => ({ getRequest: () => request }),
	} as unknown as ExecutionContext;
}

function makeNext(): CallHandler {
	return { handle: vi.fn().mockReturnValue({}) } as unknown as CallHandler;
}

describe('SentryUserInterceptor', () => {
	it('sets Sentry user when request.session.user.id is present', () => {
		mockSetUser.mockClear();
		const interceptor = new SentryUserInterceptor();
		const ctx = makeContext({
			session: { user: { id: 'user-123', email: 'a@b.test' } },
		});

		interceptor.intercept(ctx, makeNext());

		expect(mockSetUser).toHaveBeenCalledTimes(1);
		expect(mockSetUser).toHaveBeenCalledWith({
			id: 'user-123',
			email: 'a@b.test',
		});
	});

	it('does not call setUser when session is absent', () => {
		mockSetUser.mockClear();
		const interceptor = new SentryUserInterceptor();
		const ctx = makeContext({});

		interceptor.intercept(ctx, makeNext());

		expect(mockSetUser).not.toHaveBeenCalled();
	});

	it('does not call setUser when session.user.id is missing', () => {
		mockSetUser.mockClear();
		const interceptor = new SentryUserInterceptor();
		const ctx = makeContext({ session: { user: { email: 'a@b.test' } } });

		interceptor.intercept(ctx, makeNext());

		expect(mockSetUser).not.toHaveBeenCalled();
	});

	it('does not call setUser when session is null', () => {
		mockSetUser.mockClear();
		const interceptor = new SentryUserInterceptor();
		const ctx = makeContext({ session: null });

		interceptor.intercept(ctx, makeNext());

		expect(mockSetUser).not.toHaveBeenCalled();
	});

	it('passes through to next.handle() in all cases', () => {
		const interceptor = new SentryUserInterceptor();
		const next = makeNext();
		const ctx = makeContext({
			session: { user: { id: 'user-123', email: 'a@b.test' } },
		});

		interceptor.intercept(ctx, next);

		expect(next.handle).toHaveBeenCalledTimes(1);
	});
});
