import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TwoFactorActivateRepos } from '../../../src/application/ports/out/two-factor-activate-unit-of-work.port';
import type { TwoFactorInsertParams } from '../../../src/application/ports/out/two-factor-repository.port';
import { activateTwoFactor } from '../../../src/application/use-cases/activateTwoFactor.use-case';

const USER_ID = 'user-001';
const VERIFIED_AT = new Date('2024-06-01T12:00:00.000Z');

const TOTP_PARAMS: TwoFactorInsertParams = {
	method: 'totp',
	verifiedAt: VERIFIED_AT,
};
const EMAIL_PARAMS: TwoFactorInsertParams = {
	method: 'email',
	verifiedAt: VERIFIED_AT,
};
const SMS_PARAMS: TwoFactorInsertParams = {
	method: 'sms',
	verifiedAt: VERIFIED_AT,
};

function makeRepos(
	overrides: Partial<{
		findEnabledByUserId: ReturnType<typeof vi.fn>;
		insert: ReturnType<typeof vi.fn>;
		deactivate: ReturnType<typeof vi.fn>;
		insertEvent: ReturnType<typeof vi.fn>;
	}> = {},
): TwoFactorActivateRepos {
	return {
		twoFactor: {
			findEnabledByUserId:
				overrides.findEnabledByUserId ?? vi.fn().mockResolvedValue(null),
			insert: overrides.insert ?? vi.fn().mockResolvedValue(undefined),
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

describe('activateTwoFactor', () => {
	// ── first-time activation ─────────────────────────────────────────────────

	describe('first-time activation (no current method)', () => {
		it('totp: calls insert with correct TwoFactorInsertParams, deactivate NOT called, event 2fa_activated', async () => {
			const insert = vi.fn().mockResolvedValue(undefined);
			const deactivate = vi.fn().mockResolvedValue(undefined);
			const insertEvent = vi.fn().mockResolvedValue(undefined);
			const repos = makeRepos({ insert, deactivate, insertEvent });
			const deps = makeDeps(repos);

			await activateTwoFactor(deps, {
				userId: USER_ID,
				insertParams: TOTP_PARAMS,
			});

			expect(deactivate).not.toHaveBeenCalled();
			expect(insert).toHaveBeenCalledOnce();
			expect(insert).toHaveBeenCalledWith(USER_ID, TOTP_PARAMS);
			expect(insertEvent).toHaveBeenCalledOnce();
			expect(insertEvent.mock.calls[0][0].eventType).toBe('2fa_activated');
		});

		it('email: calls insert with email TwoFactorInsertParams', async () => {
			const insert = vi.fn().mockResolvedValue(undefined);
			const repos = makeRepos({ insert });
			const deps = makeDeps(repos);

			await activateTwoFactor(deps, {
				userId: USER_ID,
				insertParams: EMAIL_PARAMS,
			});

			expect(insert).toHaveBeenCalledWith(USER_ID, EMAIL_PARAMS);
		});

		it('sms: calls insert with sms TwoFactorInsertParams', async () => {
			const insert = vi.fn().mockResolvedValue(undefined);
			const repos = makeRepos({ insert });
			const deps = makeDeps(repos);

			await activateTwoFactor(deps, {
				userId: USER_ID,
				insertParams: SMS_PARAMS,
			});

			expect(insert).toHaveBeenCalledWith(USER_ID, SMS_PARAMS);
		});
	});

	// ── method switch ─────────────────────────────────────────────────────────

	it('method switch (totp → email): deactivate called, insert called, event 2fa_method_switched', async () => {
		const deactivate = vi.fn().mockResolvedValue(undefined);
		const insert = vi.fn().mockResolvedValue(undefined);
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({
			findEnabledByUserId: vi.fn().mockResolvedValue({
				id: 'tf-1',
				userId: USER_ID,
				method: 'totp',
				enabled: true,
				verifiedAt: null,
			}),
			deactivate,
			insert,
			insertEvent,
		});
		const deps = makeDeps(repos);

		await activateTwoFactor(deps, {
			userId: USER_ID,
			insertParams: EMAIL_PARAMS,
		});

		expect(deactivate).toHaveBeenCalledOnce();
		expect(deactivate).toHaveBeenCalledWith(USER_ID);
		expect(insert).toHaveBeenCalledWith(USER_ID, EMAIL_PARAMS);
		expect(insertEvent.mock.calls[0][0].eventType).toBe('2fa_method_switched');
	});

	// ── re-enable same method ─────────────────────────────────────────────────

	it('re-enable same method (totp → totp): deactivate called, insert new row, event 2fa_activated', async () => {
		const deactivate = vi.fn().mockResolvedValue(undefined);
		const insert = vi.fn().mockResolvedValue(undefined);
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({
			findEnabledByUserId: vi.fn().mockResolvedValue({
				id: 'tf-1',
				userId: USER_ID,
				method: 'totp',
				enabled: true,
				verifiedAt: null,
			}),
			deactivate,
			insert,
			insertEvent,
		});
		const deps = makeDeps(repos);

		await activateTwoFactor(deps, {
			userId: USER_ID,
			insertParams: TOTP_PARAMS,
		});

		expect(deactivate).toHaveBeenCalledOnce();
		expect(insert).toHaveBeenCalledWith(USER_ID, TOTP_PARAMS);
		expect(insertEvent.mock.calls[0][0].eventType).toBe('2fa_activated');
	});

	// ── audit event fields ────────────────────────────────────────────────────

	it('passes correlationId, ipHash, userAgent, method to insertEvent', async () => {
		const insertEvent = vi.fn().mockResolvedValue(undefined);
		const repos = makeRepos({ insertEvent });
		const deps = makeDeps(repos);

		await activateTwoFactor(deps, {
			userId: USER_ID,
			insertParams: TOTP_PARAMS,
		});

		const call = insertEvent.mock.calls[0][0];
		expect(call.userId).toBe(USER_ID);
		expect(call.correlationId).toBe('corr-001');
		expect(call.ipHash).toBe('hash-001');
		expect(call.userAgent).toBe('test-agent');
		expect(call.method).toBe('totp');
	});

	// ── UoW failure ───────────────────────────────────────────────────────────

	it('propagates UoW error when insert rejects', async () => {
		const repos = makeRepos({
			insert: vi.fn().mockRejectedValue(new Error('db error')),
		});
		const deps = makeDeps(repos);

		await expect(
			activateTwoFactor(deps, { userId: USER_ID, insertParams: TOTP_PARAMS }),
		).rejects.toThrow('db error');
	});
});
