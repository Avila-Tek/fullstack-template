import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleSessionRepository } from '../../../../src/infrastructure/database/repositories/drizzle-session-repository.adapter';

const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
} as never;

function buildMockDb() {
	// delete chain: db.delete(table).where(condition)
	const deleteWhereMock = vi.fn().mockResolvedValue([]);
	const deleteMock = vi.fn().mockReturnValue({ where: deleteWhereMock });

	// select chain: db.select({...}).from(table).innerJoin(...).where(...).limit(1)
	const limitMock = vi.fn().mockResolvedValue([]);
	const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
	const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
	const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });

	// revokeAllForUser chain: db.delete(table).where(condition).returning(...)
	const returningMock = vi.fn().mockResolvedValue([]);
	deleteWhereMock.mockReturnValue({ returning: returningMock });

	return {
		db: { delete: deleteMock, select: selectMock },
		deleteMock,
		deleteWhereMock,
		returningMock,
		selectMock,
		fromMock,
		innerJoinMock,
		whereMock,
		limitMock,
	};
}

describe('DrizzleSessionRepository — deleteById', () => {
	let repo: DrizzleSessionRepository;
	let mocks: ReturnType<typeof buildMockDb>;

	beforeEach(() => {
		mocks = buildMockDb();
		// deleteById uses delete().where() without .returning()
		mocks.deleteWhereMock.mockResolvedValue(undefined);
		repo = new DrizzleSessionRepository(mocks.db as never, mockLogger);
	});

	it('calls delete().where() with the given sessionId', async () => {
		await repo.deleteById('session-abc');
		expect(mocks.deleteMock).toHaveBeenCalledOnce();
		expect(mocks.deleteWhereMock).toHaveBeenCalledOnce();
	});

	it('resolves without error', async () => {
		await expect(repo.deleteById('session-abc')).resolves.toBeUndefined();
	});
});

describe('DrizzleSessionRepository — findByIdWithUser', () => {
	let repo: DrizzleSessionRepository;
	let mocks: ReturnType<typeof buildMockDb>;

	beforeEach(() => {
		mocks = buildMockDb();
		repo = new DrizzleSessionRepository(mocks.db as never, mockLogger);
	});

	it('returns null when no row is found', async () => {
		mocks.limitMock.mockResolvedValue([]);
		const result = await repo.findByIdWithUser('session-xyz');
		expect(result).toBeNull();
	});

	it('returns the mapped shape when a row is found', async () => {
		const createdAt = new Date('2024-01-01T00:00:00Z');
		const invalidBefore = new Date('2024-06-01T00:00:00Z');

		mocks.limitMock.mockResolvedValue([
			{
				sessionId: 'session-1',
				sessionCreatedAt: createdAt,
				userId: 'user-1',
				sessionInvalidBefore: invalidBefore,
			},
		]);

		const result = await repo.findByIdWithUser('session-1');

		expect(result).toEqual({
			session: { id: 'session-1', createdAt, userId: 'user-1' },
			sessionInvalidBefore: invalidBefore,
		});
	});

	it('returns sessionInvalidBefore as null when the user has no forced invalidation', async () => {
		mocks.limitMock.mockResolvedValue([
			{
				sessionId: 'session-2',
				sessionCreatedAt: new Date(),
				userId: 'user-2',
				sessionInvalidBefore: null,
			},
		]);

		const result = await repo.findByIdWithUser('session-2');
		expect(result?.sessionInvalidBefore).toBeNull();
	});
});
