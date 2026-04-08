import type { ErrorEvent, EventHint } from '@sentry/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above imports by Vitest's transform — Sentry.init becomes a no-op.
vi.mock('@sentry/nestjs', () => ({ init: vi.fn() }));

import { createSentryOptions } from '@/instrument';

describe('createSentryOptions', () => {
	const originalNodeEnv = process.env.NODE_ENV;
	const originalDsn = process.env.SENTRY_DSN;
	const originalGitSha = process.env.GIT_SHA;

	beforeEach(() => {
		delete process.env.SENTRY_DSN;
		delete process.env.GIT_SHA;
	});

	afterEach(() => {
		process.env.NODE_ENV = originalNodeEnv;
		if (originalDsn === undefined) {
			delete process.env.SENTRY_DSN;
		} else {
			process.env.SENTRY_DSN = originalDsn;
		}
		if (originalGitSha === undefined) {
			delete process.env.GIT_SHA;
		} else {
			process.env.GIT_SHA = originalGitSha;
		}
	});

	it('returns enabled: false when NODE_ENV is not production', () => {
		process.env.NODE_ENV = 'development';
		expect(createSentryOptions().enabled).toBe(false);
	});

	it('returns enabled: true when NODE_ENV is production', () => {
		process.env.NODE_ENV = 'production';
		expect(createSentryOptions().enabled).toBe(true);
	});

	it('sets tracesSampleRate to 0.1', () => {
		expect(createSentryOptions().tracesSampleRate).toBe(0.1);
	});

	it('reads DSN from SENTRY_DSN environment variable', () => {
		process.env.SENTRY_DSN = 'https://test@sentry.io/123';
		expect(createSentryOptions().dsn).toBe('https://test@sentry.io/123');
	});

	it('does not throw when SENTRY_DSN is absent and NODE_ENV is development', () => {
		delete process.env.SENTRY_DSN;
		process.env.NODE_ENV = 'development';
		expect(() => createSentryOptions()).not.toThrow();
	});

	it('sets release to GIT_SHA env var', () => {
		process.env.GIT_SHA = 'abc1234';
		expect(createSentryOptions().release).toBe('abc1234');
	});

	it('sets release to undefined when GIT_SHA is absent', () => {
		delete process.env.GIT_SHA;
		expect(createSentryOptions().release).toBeUndefined();
	});

	it('sets environment to NODE_ENV', () => {
		process.env.NODE_ENV = 'staging';
		expect(createSentryOptions().environment).toBe('staging');
	});

	describe('beforeSend', () => {
		function callBeforeSend(exception: unknown): ErrorEvent | null {
			const { beforeSend } = createSentryOptions();
			return beforeSend(
				{} as ErrorEvent,
				{ originalException: exception } as EventHint,
			);
		}

		it('returns null for events with HTTP status < 500 (drops 4xx)', () => {
			expect(callBeforeSend({ status: 404 })).toBeNull();
		});

		it('returns null when status comes from response.status (Axios error shape)', () => {
			expect(callBeforeSend({ response: { status: 422 } })).toBeNull();
		});

		it('returns the event for status >= 500', () => {
			const event = { message: 'server error' } as ErrorEvent;
			const { beforeSend } = createSentryOptions();
			expect(
				beforeSend(event, { originalException: { status: 500 } } as EventHint),
			).toBe(event);
		});

		it('returns the event when no status is present (unclassified errors pass through)', () => {
			const event = { message: 'unknown error' } as ErrorEvent;
			const { beforeSend } = createSentryOptions();
			expect(
				beforeSend(event, {
					originalException: new Error('boom'),
				} as EventHint),
			).toBe(event);
		});

		it('returns the event when originalException is null', () => {
			const event = { message: 'null error' } as ErrorEvent;
			const { beforeSend } = createSentryOptions();
			expect(beforeSend(event, { originalException: null } as EventHint)).toBe(
				event,
			);
		});
	});
});
