import { describe, expect, it, vi } from 'vitest';
import { DrizzleGrantAccessUnitOfWorkAdapter } from '../../../../src/infrastructure/database/repositories/drizzle-grant-access-unit-of-work.adapter';

function makeDb(shouldFail = false) {
	const tx = { _isTx: true };
	const transactionMock = vi
		.fn()
		.mockImplementation(async (work: (tx: unknown) => Promise<unknown>) => {
			if (shouldFail) throw new Error('tx failed');
			return work(tx);
		});
	return { db: { transaction: transactionMock }, transactionMock };
}

describe('DrizzleGrantAccessUnitOfWorkAdapter', () => {
	it('executes work inside a transaction', async () => {
		const { db, transactionMock } = makeDb();
		const uow = new DrizzleGrantAccessUnitOfWorkAdapter(db as never);
		await uow.run(async () => 'result');
		expect(transactionMock).toHaveBeenCalledOnce();
	});

	it('passes repos with user, account, and membership', async () => {
		const { db } = makeDb();
		const uow = new DrizzleGrantAccessUnitOfWorkAdapter(db as never);
		await uow.run(async (repos) => {
			expect(repos.user).toBeDefined();
			expect(repos.account).toBeDefined();
			expect(repos.membership).toBeDefined();
		});
	});

	it('returns the value produced by the work function', async () => {
		const { db } = makeDb();
		const uow = new DrizzleGrantAccessUnitOfWorkAdapter(db as never);
		const result = await uow.run(async () => 42);
		expect(result).toBe(42);
	});

	it('propagates transaction errors', async () => {
		const { db } = makeDb(true);
		const uow = new DrizzleGrantAccessUnitOfWorkAdapter(db as never);
		await expect(uow.run(async () => 'x')).rejects.toThrow('tx failed');
	});
});
