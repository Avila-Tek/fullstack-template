import { describe, expect, it, vi } from 'vitest';
import { DrizzleTwoFactorActivateUnitOfWorkAdapter } from '../../../../src/infrastructure/database/repositories/drizzle-two-factor-activate-unit-of-work.adapter';

function makeTx(findRows: unknown[] = []) {
	const selectChain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue(findRows),
	};
	const insertChain = { values: vi.fn().mockResolvedValue(undefined) };
	const updateChain = {
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue(undefined),
	};
	const tx = {
		select: vi.fn().mockReturnValue(selectChain),
		insert: vi.fn().mockReturnValue(insertChain),
		update: vi.fn().mockReturnValue(updateChain),
		_selectChain: selectChain,
		_insertChain: insertChain,
		_updateChain: updateChain,
	};
	return tx;
}

function makeDb(shouldFail = false, findRows: unknown[] = []) {
	const tx = makeTx(findRows);
	const transactionMock = vi
		.fn()
		.mockImplementation(async (work: (tx: unknown) => Promise<unknown>) => {
			if (shouldFail) throw new Error('tx failed');
			return work(tx);
		});
	return { db: { transaction: transactionMock }, transactionMock, tx };
}

describe('DrizzleTwoFactorActivateUnitOfWorkAdapter', () => {
	it('executes work inside a transaction', async () => {
		const { db, transactionMock } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async () => 'result');
		expect(transactionMock).toHaveBeenCalledOnce();
	});

	it('passes repos with twoFactor and auditLog (no user repo)', async () => {
		const { db } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			expect(repos.twoFactor).toBeDefined();
			expect(repos.auditLog).toBeDefined();
			expect((repos as Record<string, unknown>).user).toBeUndefined();
		});
	});

	it('twoFactor repo exposes findEnabledByUserId, insert, deactivate', async () => {
		const { db } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			expect(typeof repos.twoFactor.findEnabledByUserId).toBe('function');
			expect(typeof repos.twoFactor.insert).toBe('function');
			expect(typeof repos.twoFactor.deactivate).toBe('function');
		});
	});

	it('auditLog repo exposes insertEvent', async () => {
		const { db } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			expect(typeof repos.auditLog.insertEvent).toBe('function');
		});
	});

	it('returns the value produced by the work function', async () => {
		const { db } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		const result = await uow.run(async () => 99);
		expect(result).toBe(99);
	});

	it('propagates transaction errors (rollback path)', async () => {
		const { db } = makeDb(true);
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await expect(uow.run(async () => 'x')).rejects.toThrow('tx failed');
	});

	it('findEnabledByUserId returns the first row when one exists', async () => {
		const row = {
			id: 'row-1',
			userId: 'user-1',
			method: 'email',
			enabled: true,
			verifiedAt: new Date(),
		};
		const { db, tx } = makeDb(false, [row]);
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			const result = await repos.twoFactor.findEnabledByUserId('user-1');
			expect(result).toEqual(row);
			expect(tx.select).toHaveBeenCalledOnce();
			expect(tx._selectChain.limit).toHaveBeenCalledWith(1);
		});
	});

	it('findEnabledByUserId returns null when no row exists', async () => {
		const { db } = makeDb(false, []);
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			const result = await repos.twoFactor.findEnabledByUserId('user-1');
			expect(result).toBeNull();
		});
	});

	it('deactivate calls tx.update().set({ enabled: false, updatedAt }) and where clause', async () => {
		const { db, tx } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			await repos.twoFactor.deactivate('user-1');
		});
		expect(tx.update).toHaveBeenCalledOnce();
		expect(tx._updateChain.set).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false, updatedAt: expect.any(Date) }),
		);
		expect(tx._updateChain.where).toHaveBeenCalledOnce();
	});

	it('auditLog.insertEvent calls tx.insert().values() with expected audit fields', async () => {
		const { db, tx } = makeDb();
		const uow = new DrizzleTwoFactorActivateUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			await repos.auditLog.insertEvent({
				userId: 'user-1',
				eventType: '2fa_activated',
				correlationId: 'corr-1',
				ipHash: 'hash',
				userAgent: 'agent',
				method: 'email',
			});
		});
		expect(tx.insert).toHaveBeenCalledOnce();
		expect(tx._insertChain.values).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				eventType: '2fa_activated',
				correlationId: 'corr-1',
				ipHash: 'hash',
				userAgent: 'agent',
				method: 'email',
			}),
		);
	});
});
