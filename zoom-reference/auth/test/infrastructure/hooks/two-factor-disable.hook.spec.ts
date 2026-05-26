import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock(
	'../../../src/application/use-cases/deactivateTwoFactor.use-case',
	() => ({ deactivateTwoFactor: vi.fn().mockResolvedValue(undefined) }),
);

import { deactivateTwoFactor } from '../../../src/application/use-cases/deactivateTwoFactor.use-case';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorDisableHook } from '../../../src/infrastructure/hooks/two-factor-disable.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;
const deactivateTwoFactorMock = deactivateTwoFactor as ReturnType<typeof vi.fn>;

function buildDeps() {
	const uow = { run: vi.fn() };
	return { uow };
}

function makeHook(deps: ReturnType<typeof buildDeps>) {
	return new TwoFactorDisableHook(deps.uow as never);
}

function makeCtx() {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	return {
		request: new Request('http://localhost/two-factor/disable', { headers }),
		getHeader: (name: string) => headers[name] ?? null,
		context: {} as Record<string, unknown>,
	};
}

describe('TwoFactorDisableHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deactivateTwoFactorMock.mockResolvedValue(undefined);
	});

	describe('afterDisable (/two-factor/disable)', () => {
		it('calls deactivateTwoFactor with correct deps and userId when session exists', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterDisable(makeCtx() as never);

			expect(deactivateTwoFactorMock).toHaveBeenCalledOnce();
			const [callDeps, callParams] = deactivateTwoFactorMock.mock.calls[0] as [
				Record<string, unknown>,
				Record<string, unknown>,
			];
			expect(callDeps.uow).toBe(deps.uow);
			expect(callDeps.correlationId).toBe('corr-1');
			expect(callParams.userId).toBe('user-1');
		});

		it('does not call deactivateTwoFactor when no session', async () => {
			getSessionMock.mockResolvedValue(null);
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterDisable(makeCtx() as never);

			expect(deactivateTwoFactorMock).not.toHaveBeenCalled();
		});

		it('emits 2fa_disabled metric when session exists', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const deps = buildDeps();
			const hook = makeHook(deps);

			await hook.afterDisable(makeCtx() as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_disabled');
		});
	});
});
