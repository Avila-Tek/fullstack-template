import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorSkipHook } from '../../../src/infrastructure/hooks/two-factor-skip.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;

function buildDeps() {
	const auditLog = { insertEvent: vi.fn().mockResolvedValue(undefined) };
	return { auditLog };
}

function makeHook(deps: ReturnType<typeof buildDeps>) {
	return new TwoFactorSkipHook(deps.auditLog as never);
}

function makeCtx() {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	return {
		request: new Request('http://localhost/two-factor/skip', { headers }),
		getHeader: (name: string) => headers[name] ?? null,
		context: {} as Record<string, unknown>,
	};
}

describe('TwoFactorSkipHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
	});

	describe('afterSkip (/two-factor/skip)', () => {
		it('inserts a 2fa_setup_skipped audit event', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterSkip(makeCtx() as never);

			expect(deps.auditLog.insertEvent).toHaveBeenCalledOnce();
			const params = (deps.auditLog.insertEvent as ReturnType<typeof vi.fn>)
				.mock.calls[0][0] as Record<string, unknown>;
			expect(params.eventType).toBe('2fa_setup_skipped');
			expect(params.userId).toBe('user-1');
		});

		it('records the 2fa_enrollment_skipped metric', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterSkip(makeCtx() as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_enrollment_skipped');
		});

		it('does nothing when request is absent', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterSkip({
				request: null,
				getHeader: () => null,
				context: {},
			} as never);

			expect(deps.auditLog.insertEvent).not.toHaveBeenCalled();
			expect(recordAuthEvent).not.toHaveBeenCalled();
		});

		it('does nothing when session is absent', async () => {
			getSessionMock.mockResolvedValue(null);
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterSkip(makeCtx() as never);

			expect(deps.auditLog.insertEvent).not.toHaveBeenCalled();
			expect(recordAuthEvent).not.toHaveBeenCalled();
		});
	});
});
