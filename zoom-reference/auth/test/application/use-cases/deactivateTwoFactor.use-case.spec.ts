import { describe, expect, it, vi } from 'vitest';
import type { TwoFactorActivateRepos } from '../../../src/application/ports/out/two-factor-activate-unit-of-work.port';
import { deactivateTwoFactor } from '../../../src/application/use-cases/deactivateTwoFactor.use-case';

const USER_ID = 'user-001';

function makeRepos(
	overrides: Partial<{
		deactivate: ReturnType<typeof vi.fn>;
		insertEvent: ReturnType<typeof vi.fn>;
	}> = {},
): TwoFactorActivateRepos {
	return {
		twoFactor: {
			findEnabledByUserId: vi.fn().mockResolvedValue(null),
			insert: vi.fn().mockResolvedValue(undefined),
			deactivate: overrides.deactivate ?? vi.fn().mockResolvedValue(undefined),
		},
		auditLog: {
			insertEvent:
				overrides.insertEvent ?? vi.fn().mockResolvedValue(undefined),
		},
	};
}

function makeDeps(repos: TwoFactorActivateRepos) {
	const uow = {
		run: vi
			.fn()
			.mockImplementation(
				async (work: (r: TwoFactorActivateRepos) => Promise<unknown>) =>
					work(repos),
			),
	};
	return {
		uow: uow as never,
		correlationId: 'corr-001',
		ipHash: 'hash-001',
		userAgent: 'test-agent',
	};
}

describe('deactivateTwoFactor', () => {
	it('calls deactivate(userId) and inserts 2fa_deactivated audit event', async () => {
		const deactivate = vi.fn().mockResolvedValue(undefined);
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({ deactivate, insertEvent });
		const deps = makeDeps(repos);

		await deactivateTwoFactor(deps, { userId: USER_ID });

		expect(deactivate).toHaveBeenCalledOnce();
		expect(deactivate).toHaveBeenCalledWith(USER_ID);
		expect(insertEvent).toHaveBeenCalledOnce();
		expect(insertEvent.mock.calls[0][0].eventType).toBe('2fa_deactivated');
	});

	it('still calls deactivate and writes audit when no active method (no-op path)', async () => {
		const deactivate = vi.fn().mockResolvedValue(undefined);
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({ deactivate, insertEvent });
		const deps = makeDeps(repos);

		await deactivateTwoFactor(deps, { userId: USER_ID });

		expect(deactivate).toHaveBeenCalledOnce();
		expect(insertEvent).toHaveBeenCalledOnce();
	});

	it('does not call updateTwoFactorEnabled — user repo absent from TwoFactorActivateRepos', async () => {
		const repos = makeRepos();
		const deps = makeDeps(repos);

		await deactivateTwoFactor(deps, { userId: USER_ID });

		expect((repos as Record<string, unknown>).user).toBeUndefined();
	});

	it('passes correct audit fields to insertEvent', async () => {
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({ insertEvent });
		const deps = makeDeps(repos);

		await deactivateTwoFactor(deps, { userId: USER_ID });

		const call = insertEvent.mock.calls[0][0];
		expect(call.userId).toBe(USER_ID);
		expect(call.correlationId).toBe('corr-001');
		expect(call.ipHash).toBe('hash-001');
		expect(call.userAgent).toBe('test-agent');
		expect(call.eventType).toBe('2fa_deactivated');
	});

	it('propagates UoW error when transaction rejects', async () => {
		const repos = makeRepos({
			deactivate: vi.fn().mockRejectedValue(new Error('tx failed')),
		});
		const deps = makeDeps(repos);

		await expect(
			deactivateTwoFactor(deps, { userId: USER_ID }),
		).rejects.toThrow('tx failed');
	});
});
