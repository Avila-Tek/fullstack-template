import { describe, expect, it, vi } from 'vitest';
import { DrizzleUserRepository } from '../../../../src/infrastructure/database/repositories/drizzle-user-repository.adapter';

const USER_ROW = {
	id: 'user-1',
	email: 'alice@example.com',
	fullName: 'Alice',
	normalizedEmail: 'alice@example.com',
	emailVerified: false,
	twoFactorEnabled: false,
	platformAdmin: false,
	image: null,
	sessionInvalidBefore: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

function makeSelectDb(rows: unknown[] = []) {
	const limitMock = vi.fn().mockResolvedValue(rows);
	const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
	const fromMock = vi.fn().mockReturnValue({ where: whereMock });
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });
	return {
		db: { select: selectMock },
		selectMock,
		fromMock,
		whereMock,
		limitMock,
	};
}

describe('DrizzleUserRepository.findByNormalizedEmail', () => {
	it('returns null when no user found', async () => {
		const { db } = makeSelectDb([]);
		const repo = new DrizzleUserRepository(db as never);
		const result = await repo.findByNormalizedEmail('alice@example.com');
		expect(result).toBeNull();
	});

	it('returns a User when a row exists', async () => {
		const { db } = makeSelectDb([USER_ROW]);
		const repo = new DrizzleUserRepository(db as never);
		const result = await repo.findByNormalizedEmail('alice@example.com');
		expect(result).not.toBeNull();
		expect(result?.id).toBe('user-1');
		expect(result?.emailVerified).toBe(false);
	});

	it('queries using the normalizedEmail column', async () => {
		const { db, whereMock } = makeSelectDb([]);
		const repo = new DrizzleUserRepository(db as never);
		await repo.findByNormalizedEmail('alice@example.com');
		expect(whereMock).toHaveBeenCalledOnce();
	});
});

describe('DrizzleUserRepository.createProvisioned', () => {
	it('inserts only a user row (no account insert)', async () => {
		const returningMock = vi.fn().mockResolvedValue([USER_ROW]);
		const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
		const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
		const db = { insert: insertMock };

		const repo = new DrizzleUserRepository(db as never);
		const result = await repo.createProvisioned({
			email: 'alice@example.com',
			normalizedEmail: 'alice@example.com',
			fullName: '',
		});

		expect(insertMock).toHaveBeenCalledTimes(1);
		expect(result.id).toBe('user-1');
	});

	it('sets emailVerified, twoFactorEnabled, platformAdmin to false', async () => {
		const returningMock = vi.fn().mockResolvedValue([USER_ROW]);
		const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
		const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
		const db = { insert: insertMock };

		const repo = new DrizzleUserRepository(db as never);
		await repo.createProvisioned({
			email: 'alice@example.com',
			normalizedEmail: 'alice@example.com',
			fullName: '',
		});

		const values = valuesMock.mock.calls[0][0];
		expect(values.emailVerified).toBe(false);
		expect(values.twoFactorEnabled).toBe(false);
		expect(values.platformAdmin).toBe(false);
	});
});
