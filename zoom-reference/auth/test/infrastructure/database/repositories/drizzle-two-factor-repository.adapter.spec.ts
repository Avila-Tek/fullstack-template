import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleTwoFactorRepository } from '../../../../src/infrastructure/database/repositories/drizzle-two-factor-repository.adapter';

const USER_ID = 'user-001';
const VERIFIED_AT = new Date('2024-06-01T12:00:00.000Z');

// ── select mock ────────────────────────────────────────────────────────────

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

// ── insert mock ────────────────────────────────────────────────────────────

function makeInsertDb() {
	const valuesMock = vi.fn().mockResolvedValue(undefined);
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { db: { insert: insertMock }, insertMock, valuesMock };
}

// ── update mock ────────────────────────────────────────────────────────────

function makeUpdateDb() {
	const whereMock = vi.fn().mockResolvedValue(undefined);
	const setMock = vi.fn().mockReturnValue({ where: whereMock });
	const updateMock = vi.fn().mockReturnValue({ set: setMock });
	return { db: { update: updateMock }, updateMock, setMock, whereMock };
}

// ── findEnabledByUserId ────────────────────────────────────────────────────

describe('DrizzleTwoFactorRepository.findEnabledByUserId', () => {
	it('returns null when no enabled row exists', async () => {
		const { db } = makeSelectDb([]);
		const repo = new DrizzleTwoFactorRepository(db as never);
		expect(await repo.findEnabledByUserId(USER_ID)).toBeNull();
	});

	it('returns the row when an enabled row exists', async () => {
		const row = {
			id: 'tf-1',
			userId: USER_ID,
			method: 'totp',
			enabled: true,
			verifiedAt: VERIFIED_AT,
		};
		const { db } = makeSelectDb([row]);
		const repo = new DrizzleTwoFactorRepository(db as never);
		const result = await repo.findEnabledByUserId(USER_ID);
		expect(result).toEqual(row);
	});
});

// ── insert ─────────────────────────────────────────────────────────────────

describe('DrizzleTwoFactorRepository.insert', () => {
	let repo: DrizzleTwoFactorRepository;
	let insertMock: ReturnType<typeof vi.fn>;
	let valuesMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		const mocks = makeInsertDb();
		insertMock = mocks.insertMock;
		valuesMock = mocks.valuesMock;
		repo = new DrizzleTwoFactorRepository(mocks.db as never);
	});

	it('inserts totp row with userId, method, enabled=true, verifiedAt', async () => {
		await repo.insert(USER_ID, { method: 'totp', verifiedAt: VERIFIED_AT });

		expect(insertMock).toHaveBeenCalledOnce();
		const inserted = (valuesMock.mock.calls[0] as [Record<string, unknown>])[0];
		expect(inserted.userId).toBe(USER_ID);
		expect(inserted.method).toBe('totp');
		expect(inserted.enabled).toBe(true);
		expect(inserted.verifiedAt).toBe(VERIFIED_AT);
	});

	it('inserts email row with method=email', async () => {
		await repo.insert(USER_ID, { method: 'email', verifiedAt: VERIFIED_AT });

		const inserted = (valuesMock.mock.calls[0] as [Record<string, unknown>])[0];
		expect(inserted.method).toBe('email');
		expect(inserted.enabled).toBe(true);
	});

	it('inserts sms row with method=sms', async () => {
		await repo.insert(USER_ID, { method: 'sms', verifiedAt: VERIFIED_AT });

		const inserted = (valuesMock.mock.calls[0] as [Record<string, unknown>])[0];
		expect(inserted.method).toBe('sms');
		expect(inserted.enabled).toBe(true);
	});
});

// ── deactivate ─────────────────────────────────────────────────────────────

describe('DrizzleTwoFactorRepository.deactivate', () => {
	let repo: DrizzleTwoFactorRepository;
	let updateMock: ReturnType<typeof vi.fn>;
	let setMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		const mocks = makeUpdateDb();
		updateMock = mocks.updateMock;
		setMock = mocks.setMock;
		repo = new DrizzleTwoFactorRepository(mocks.db as never);
	});

	it('calls update().set({ enabled: false }) for the given userId', async () => {
		await repo.deactivate(USER_ID);

		expect(updateMock).toHaveBeenCalledOnce();
		expect(setMock).toHaveBeenCalledOnce();
		const setArg = (setMock.mock.calls[0] as [Record<string, unknown>])[0];
		expect(setArg.enabled).toBe(false);
	});

	it('applies a where clause (userId + enabled=true filter)', async () => {
		const { db, whereMock } = makeUpdateDb();
		const r = new DrizzleTwoFactorRepository(db as never);
		await r.deactivate(USER_ID);

		expect(whereMock).toHaveBeenCalledOnce();
	});

	it('resolves without error when no enabled row exists (no-op update)', async () => {
		await expect(repo.deactivate(USER_ID)).resolves.toBeUndefined();
	});
});
