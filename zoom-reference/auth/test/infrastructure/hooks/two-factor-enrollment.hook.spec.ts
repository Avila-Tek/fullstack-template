import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorEnrollmentHook } from '../../../src/infrastructure/hooks/two-factor-enrollment.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;

function buildDeps() {
	const auditLog = { insertEvent: vi.fn().mockResolvedValue(undefined) };
	return { auditLog };
}

function makeHook(deps: ReturnType<typeof buildDeps>) {
	return new TwoFactorEnrollmentHook(deps.auditLog as never);
}

function makeCtx() {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	return {
		request: new Request('http://localhost/two-factor', { headers }),
		getHeader: (name: string) => headers[name] ?? null,
		context: {} as Record<string, unknown>,
	};
}

describe('TwoFactorEnrollmentHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
	});

	describe('afterEnable (/two-factor/enable)', () => {
		it('inserts a 2fa_setup_enrolled audit event', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterEnable(makeCtx() as never);

			expect(deps.auditLog.insertEvent).toHaveBeenCalledOnce();
			const params = (deps.auditLog.insertEvent as ReturnType<typeof vi.fn>)
				.mock.calls[0][0] as Record<string, unknown>;
			expect(params.eventType).toBe('2fa_setup_started');
			expect(params.userId).toBe('user-1');
		});

		it('records the 2fa_enrolled metric', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterEnable(makeCtx() as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_setup_started');
		});
	});
});
