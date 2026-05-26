/**
 * Unit tests for DrizzleDeviceRepositoryAdapter.upsert()
 *
 * The adapter wraps the SELECT + INSERT in a transaction with SELECT FOR UPDATE
 * to prevent concurrent logins from both firing a new-device alert (TOCTOU fix).
 *
 * isNew detection: fresh INSERT returns our generated id; ON CONFLICT DO UPDATE
 * returns the pre-existing row's id. So `row.id === generatedId` is the check.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthDb } from '../../../../src/infrastructure/database/drizzle.module';
import { DrizzleDeviceRepositoryAdapter } from '../../../../src/infrastructure/database/repositories/drizzle-device-repository.adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UPSERT_PARAMS = {
	userId: 'user-001',
	deviceName: 'Chrome on macOS',
	deviceType: 'desktop',
	userAgent: 'Mozilla/5.0 (Macintosh)',
	ipAddress: '1.2.3.4',
};

// Fixed UUID returned by crypto.randomUUID() throughout these tests.
// Conflict tests return a different id so that row.id !== GENERATED_ID → isNew: false.
const GENERATED_ID = '00000000-0000-0000-0000-000000000001';
const EXISTING_ID = 'existing-device-id';

/**
 * Builds a mock db that supports the transaction → SELECT FOR UPDATE → INSERT chain.
 *
 * selectRows: rows returned by SELECT FOR UPDATE ([] = first login for this device)
 * insertRows: rows returned by INSERT ... RETURNING
 */
function makeDb(
	selectRows: { ipAddress: string }[],
	insertRows: { id: string }[],
) {
	// SELECT chain: select().from().where().for().limit()
	const limitMock = vi.fn().mockResolvedValue(selectRows);
	const forMock = vi.fn().mockReturnValue({ limit: limitMock });
	const whereMock = vi.fn().mockReturnValue({ for: forMock });
	const fromMock = vi.fn().mockReturnValue({ where: whereMock });
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });

	// INSERT chain: insert().values().onConflictDoUpdate().returning()
	const returningMock = vi.fn().mockResolvedValue(insertRows);
	const onConflictDoUpdateMock = vi
		.fn()
		.mockReturnValue({ returning: returningMock });
	const valuesMock = vi.fn().mockReturnValue({
		onConflictDoUpdate: onConflictDoUpdateMock,
	});
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

	// Transaction mock: calls the callback with a tx that has the same select/insert
	const txMock = { select: selectMock, insert: insertMock };
	const transactionMock = vi
		.fn()
		.mockImplementation((callback: (tx: typeof txMock) => Promise<unknown>) =>
			callback(txMock),
		);

	return {
		db: {
			select: selectMock,
			insert: insertMock,
			transaction: transactionMock,
		} as unknown as AuthDb,
		mocks: {
			select: selectMock,
			insert: insertMock,
			values: valuesMock,
			returning: returningMock,
			transaction: transactionMock,
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DrizzleDeviceRepositoryAdapter.upsert()', () => {
	beforeEach(() => {
		// Pin crypto.randomUUID so tests can predict the generated id.
		vi.spyOn(crypto, 'randomUUID').mockReturnValue(
			GENERATED_ID as ReturnType<typeof crypto.randomUUID>,
		);
	});

	it('wraps SELECT and INSERT in a transaction', async () => {
		const { db, mocks } = makeDb([], [{ id: GENERATED_ID }]);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		await repo.upsert(UPSERT_PARAMS);
		expect(mocks.transaction).toHaveBeenCalledOnce();
	});

	it('returns isNew: true and no previousIpAddress on fresh insert', async () => {
		// RETURNING yields our generated id → row.id === id → isNew: true
		const { db } = makeDb([], [{ id: GENERATED_ID }]);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.upsert(UPSERT_PARAMS);

		expect(result.isNew).toBe(true);
		expect(result.previousIpAddress).toBeUndefined();
		expect(result.id).toBe(GENERATED_ID);
	});

	it('returns isNew: false and previousIpAddress when conflict path taken', async () => {
		// RETURNING yields the pre-existing row's id → row.id !== id → isNew: false
		const { db } = makeDb([{ ipAddress: '9.9.9.9' }], [{ id: EXISTING_ID }]);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.upsert(UPSERT_PARAMS);

		expect(result.isNew).toBe(false);
		expect(result.previousIpAddress).toBe('9.9.9.9');
		expect(result.id).toBe(EXISTING_ID);
	});

	it('returns isNew: false when existing row has the same IP (no location change)', async () => {
		const { db } = makeDb(
			[{ ipAddress: UPSERT_PARAMS.ipAddress }],
			[{ id: EXISTING_ID }],
		);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.upsert(UPSERT_PARAMS);

		expect(result.isNew).toBe(false);
		expect(result.previousIpAddress).toBe(UPSERT_PARAMS.ipAddress);
	});

	it('falls back to the generated id when returning() is empty', async () => {
		const { db } = makeDb([{ ipAddress: '5.5.5.5' }], []);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.upsert(UPSERT_PARAMS);

		expect(result.id).toBe(GENERATED_ID);
	});

	it('truncates userAgent to 512 chars before storing and querying', async () => {
		const { db, mocks } = makeDb([], [{ id: GENERATED_ID }]);
		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const longAgent = 'A'.repeat(600);
		await repo.upsert({ ...UPSERT_PARAMS, userAgent: longAgent });
		expect(mocks.values).toHaveBeenCalledWith(
			expect.objectContaining({ userAgent: 'A'.repeat(512) }),
		);
	});
});

describe('DrizzleDeviceRepositoryAdapter.touchDevice()', () => {
	const TOUCH_PARAMS = {
		id: 'device-001',
		userId: 'user-001',
		userAgent: 'Mozilla/5.0 (Macintosh)',
		deviceName: 'Chrome on macOS',
		deviceType: 'desktop',
		ipAddress: '5.6.7.8',
	};

	it('returns the device id when the row is found and updated', async () => {
		const returningMock = vi.fn().mockResolvedValue([{ id: 'device-001' }]);
		const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		const updateMock = vi.fn().mockReturnValue({ set: setMock });
		const db = { update: updateMock } as unknown as AuthDb;

		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.touchDevice(TOUCH_PARAMS);

		expect(result).toEqual({ id: 'device-001' });
		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({
				ipAddress: '5.6.7.8',
				userAgent: 'Mozilla/5.0 (Macintosh)',
				deviceName: 'Chrome on macOS',
				deviceType: 'desktop',
				lastLoginAt: expect.any(Date),
			}),
		);
	});

	it('returns null when no matching row exists (stale cookie)', async () => {
		const returningMock = vi.fn().mockResolvedValue([]);
		const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		const updateMock = vi.fn().mockReturnValue({ set: setMock });
		const db = { update: updateMock } as unknown as AuthDb;

		const repo = new DrizzleDeviceRepositoryAdapter(db);
		const result = await repo.touchDevice(TOUCH_PARAMS);

		expect(result).toBeNull();
	});

	it('truncates userAgent to 512 chars', async () => {
		const returningMock = vi.fn().mockResolvedValue([{ id: 'device-001' }]);
		const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		const updateMock = vi.fn().mockReturnValue({ set: setMock });
		const db = { update: updateMock } as unknown as AuthDb;

		const repo = new DrizzleDeviceRepositoryAdapter(db);
		await repo.touchDevice({ ...TOUCH_PARAMS, userAgent: 'A'.repeat(600) });

		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({ userAgent: 'A'.repeat(512) }),
		);
	});
});
