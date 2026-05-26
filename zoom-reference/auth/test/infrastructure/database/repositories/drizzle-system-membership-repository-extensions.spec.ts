import { describe, expect, it, vi } from 'vitest';
import { DrizzleSystemMembershipRepository } from '../../../../src/infrastructure/database/repositories/drizzle-system-membership-repository.adapter';

const MEMBERSHIP_ROW = {
	id: 'mem-1',
	systemId: 'sys-1',
	organizationId: 'org-1',
	userId: 'user-1',
	role: 'member' as const,
	status: 'active' as const,
	isDeleted: false,
	createdAt: new Date('2025-01-01'),
	updatedAt: new Date('2025-01-01'),
};

const USER_ROW_FOR_JOIN = {
	userId: 'user-1',
	email: 'alice@example.com',
	role: 'member' as const,
	activated: false,
	createdAt: new Date('2025-01-01'),
};

// ── findAllBySystem ──────────────────────────────────────────────────────────

function makeFindAllDb(rows: unknown[] = [], total = 0) {
	// Promise.all([rowsQuery, countQuery])
	const offsetMock = vi.fn().mockResolvedValue(rows);
	const limitMock = vi.fn().mockReturnValue({ offset: offsetMock });
	const orderByMock = vi.fn().mockReturnValue({ limit: limitMock });
	const whereMock1 = vi.fn().mockReturnValue({ orderBy: orderByMock });
	const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock1 });
	const fromMock1 = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });

	const whereMock2 = vi.fn().mockResolvedValue([{ count: total }]);
	const fromMock2 = vi.fn().mockReturnValue({ where: whereMock2 });

	const selectMock = vi
		.fn()
		.mockReturnValueOnce({ from: fromMock1 })
		.mockReturnValueOnce({ from: fromMock2 });

	return { db: { select: selectMock }, offsetMock, limitMock };
}

describe('DrizzleSystemMembershipRepository.findAllBySystem', () => {
	it('returns empty TPagination when no members exist', async () => {
		const { db } = makeFindAllDb([], 0);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.findAllBySystem('sys-1', {
			page: 1,
			perPage: 10,
		});
		expect(result.items).toHaveLength(0);
		expect(result.count).toBe(0);
	});

	it('returns members with activated field from user.emailVerified', async () => {
		const { db } = makeFindAllDb([USER_ROW_FOR_JOIN], 1);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.findAllBySystem('sys-1', {
			page: 1,
			perPage: 10,
		});
		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.userId).toBe('user-1');
		expect(result.items[0]?.activated).toBe(false);
		expect(result.count).toBe(1);
	});

	it('applies pagination offset correctly', async () => {
		const { db, offsetMock } = makeFindAllDb([], 0);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		await repo.findAllBySystem('sys-1', { page: 3, perPage: 5 });
		expect(offsetMock).toHaveBeenCalledWith(10); // (3-1)*5 = 10
	});

	it('applies perPage as limit', async () => {
		const { db, limitMock } = makeFindAllDb([], 0);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		await repo.findAllBySystem('sys-1', { page: 1, perPage: 7 });
		expect(limitMock).toHaveBeenCalledWith(7);
	});
});

// ── insertMembership ─────────────────────────────────────────────────────────

function makeInsertDb(returning: unknown[] = []) {
	const returningMock = vi.fn().mockResolvedValue(returning);
	const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { db: { insert: insertMock }, insertMock, valuesMock };
}

describe('DrizzleSystemMembershipRepository.insertMembership', () => {
	it('inserts with isDeleted false and status active', async () => {
		const { db, valuesMock } = makeInsertDb([MEMBERSHIP_ROW]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		await repo.insertMembership({
			userId: 'user-1',
			systemId: 'sys-1',
			organizationId: 'org-1',
			role: 'member',
		});
		const values = valuesMock.mock.calls[0][0];
		expect(values.isDeleted).toBe(false);
		expect(values.status).toBe('active');
		expect(values.role).toBe('member');
	});

	it('returns a SystemMembershipEntity', async () => {
		const { db } = makeInsertDb([MEMBERSHIP_ROW]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.insertMembership({
			userId: 'user-1',
			systemId: 'sys-1',
			organizationId: 'org-1',
			role: 'member',
		});
		expect(result.id).toBe('mem-1');
		expect(result.userId).toBe('user-1');
	});
});

// ── softDeleteByUser ─────────────────────────────────────────────────────────

function makeUpdateDb(returning: unknown[] = []) {
	const returningMock = vi.fn().mockResolvedValue(returning);
	const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
	const setMock = vi.fn().mockReturnValue({ where: whereMock });
	const updateMock = vi.fn().mockReturnValue({ set: setMock });
	return { db: { update: updateMock }, updateMock, setMock, whereMock };
}

describe('DrizzleSystemMembershipRepository.softDeleteByUser', () => {
	it('returns null when no active membership found', async () => {
		const { db } = makeUpdateDb([]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.softDeleteByUser('user-1', 'sys-1');
		expect(result).toBeNull();
	});

	it('returns the entity when membership is soft-deleted', async () => {
		const { db } = makeUpdateDb([{ ...MEMBERSHIP_ROW, isDeleted: true }]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.softDeleteByUser('user-1', 'sys-1');
		expect(result).not.toBeNull();
		expect(result?.id).toBe('mem-1');
	});

	it('sets isDeleted true in the UPDATE', async () => {
		const { db, setMock } = makeUpdateDb([MEMBERSHIP_ROW]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		await repo.softDeleteByUser('user-1', 'sys-1');
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ isDeleted: true }),
		);
	});
});

// ── updateMemberRole ─────────────────────────────────────────────────────────

describe('DrizzleSystemMembershipRepository.updateMemberRole', () => {
	it('returns null when no active membership found', async () => {
		const { db } = makeUpdateDb([]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.updateMemberRole('user-1', 'sys-1', 'admin');
		expect(result).toBeNull();
	});

	it('returns the updated entity', async () => {
		const { db } = makeUpdateDb([{ ...MEMBERSHIP_ROW, role: 'admin' }]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		const result = await repo.updateMemberRole('user-1', 'sys-1', 'admin');
		expect(result?.role).toBe('admin');
	});

	it('sets the new role in the UPDATE', async () => {
		const { db, setMock } = makeUpdateDb([MEMBERSHIP_ROW]);
		const repo = new DrizzleSystemMembershipRepository(db as never);
		await repo.updateMemberRole('user-1', 'sys-1', 'admin');
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin' }),
		);
	});
});
