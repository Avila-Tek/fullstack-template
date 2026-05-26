import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import * as schema from '../../../../src/infrastructure/database/db-schema';
import { DrizzleAccountRepository } from '../../../../src/infrastructure/database/repositories/drizzle-account-repository.adapter';

function makeInsertDb() {
	const valuesMock = vi.fn().mockResolvedValue([]);
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { db: { insert: insertMock }, insertMock, valuesMock };
}

function makeDeleteDb() {
	const whereMock = vi.fn().mockResolvedValue([]);
	const deleteMock = vi.fn().mockReturnValue({ where: whereMock });
	return { db: { delete: deleteMock }, deleteMock, whereMock };
}

describe('DrizzleAccountRepository.createCredential', () => {
	it('inserts one account row', async () => {
		const { db, insertMock } = makeInsertDb();
		const repo = new DrizzleAccountRepository(db as never);
		await repo.createCredential({
			userId: 'user-1',
			passwordHash: 'argon2hash',
		});
		expect(insertMock).toHaveBeenCalledOnce();
	});

	it('uses providerId "credential"', async () => {
		const { db, valuesMock } = makeInsertDb();
		const repo = new DrizzleAccountRepository(db as never);
		await repo.createCredential({
			userId: 'user-1',
			passwordHash: 'argon2hash',
		});
		const values = valuesMock.mock.calls[0][0];
		expect(values.providerId).toBe('credential');
	});

	it('stores the passwordHash on the password field', async () => {
		const { db, valuesMock } = makeInsertDb();
		const repo = new DrizzleAccountRepository(db as never);
		await repo.createCredential({
			userId: 'user-1',
			passwordHash: 'argon2hash',
		});
		const values = valuesMock.mock.calls[0][0];
		expect(values.password).toBe('argon2hash');
	});

	it('sets userId and accountId to the provided userId', async () => {
		const { db, valuesMock } = makeInsertDb();
		const repo = new DrizzleAccountRepository(db as never);
		await repo.createCredential({ userId: 'user-42', passwordHash: 'hash' });
		const values = valuesMock.mock.calls[0][0];
		expect(values.userId).toBe('user-42');
		expect(values.accountId).toBe('user-42');
	});

	it('resolves without error', async () => {
		const { db } = makeInsertDb();
		const repo = new DrizzleAccountRepository(db as never);
		await expect(
			repo.createCredential({ userId: 'user-1', passwordHash: 'hash' }),
		).resolves.toBeUndefined();
	});
});

describe('DrizzleAccountRepository.unlinkSocialAccountsExcept', () => {
	it('calls delete on the account table with the expected where condition', async () => {
		const { db, deleteMock, whereMock } = makeDeleteDb();
		const repo = new DrizzleAccountRepository(db as never);

		await repo.unlinkSocialAccountsExcept('user-1', 'kept@example.com');

		expect(deleteMock).toHaveBeenCalledWith(schema.account);

		const expected = and(
			eq(schema.account.userId, 'user-1'),
			ne(schema.account.providerId, 'credential'),
			or(
				isNull(schema.account.normalizedProviderEmail),
				ne(schema.account.normalizedProviderEmail, 'kept@example.com'),
			),
		);
		expect(whereMock).toHaveBeenCalledWith(expected);
	});

	it('normalizes keptEmail before building the where condition', async () => {
		const { db, whereMock } = makeDeleteDb();
		const repo = new DrizzleAccountRepository(db as never);

		await repo.unlinkSocialAccountsExcept('user-1', 'Kept+tag@GoogleMail.com');

		const expected = and(
			eq(schema.account.userId, 'user-1'),
			ne(schema.account.providerId, 'credential'),
			or(
				isNull(schema.account.normalizedProviderEmail),
				ne(schema.account.normalizedProviderEmail, 'kept@gmail.com'),
			),
		);
		expect(whereMock).toHaveBeenCalledWith(expected);
	});

	it('resolves without error', async () => {
		const { db } = makeDeleteDb();
		const repo = new DrizzleAccountRepository(db as never);

		await expect(
			repo.unlinkSocialAccountsExcept('user-1', 'kept@example.com'),
		).resolves.toBeUndefined();
	});
});
