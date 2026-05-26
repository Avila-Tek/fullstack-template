import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleTwoFactorAuditLogAdapter } from '../../../../src/infrastructure/database/repositories/drizzle-two-factor-audit-log.adapter';

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function buildMockDb() {
	const valuesMock = vi.fn().mockResolvedValue(undefined);
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { db: { insert: insertMock }, insertMock, valuesMock };
}

function getInsertedRow(
	valuesMock: ReturnType<typeof vi.fn>,
	callIndex = 0,
): Record<string, unknown> {
	return (valuesMock.mock.calls[callIndex] as [Record<string, unknown>])[0];
}

describe('DrizzleTwoFactorAuditLogAdapter', () => {
	let adapter: DrizzleTwoFactorAuditLogAdapter;
	let insertMock: ReturnType<typeof vi.fn>;
	let valuesMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		const mocks = buildMockDb();
		insertMock = mocks.insertMock;
		valuesMock = mocks.valuesMock;
		adapter = new DrizzleTwoFactorAuditLogAdapter(mocks.db as never);
	});

	it('calls db.insert(twoFactorAuditLog).values() with all required fields', async () => {
		await adapter.insertEvent({
			userId: 'user-1',
			eventType: '2fa_setup_enrolled',
			correlationId: 'corr-1',
			ipHash: 'hash-1',
			userAgent: 'Mozilla/5.0',
		});

		expect(insertMock).toHaveBeenCalledOnce();
		expect(valuesMock).toHaveBeenCalledOnce();
		const row = getInsertedRow(valuesMock);

		expect(row.userId).toBe('user-1');
		expect(row.eventType).toBe('2fa_setup_enrolled');
		expect(row.correlationId).toBe('corr-1');
		expect(row.ipHash).toBe('hash-1');
		expect(row.userAgent).toBe('Mozilla/5.0');
		expect(typeof row.id).toBe('string');
		expect(row.id as string).toMatch(UUID_REGEX);
	});

	it('defaults optional method to null when not provided', async () => {
		await adapter.insertEvent({
			userId: 'user-2',
			eventType: '2fa_setup_skipped',
			correlationId: 'corr-2',
			ipHash: 'hash-2',
			userAgent: 'agent',
		});

		const row = getInsertedRow(valuesMock);
		expect(row.method).toBeNull();
	});

	it('maps method when provided', async () => {
		await adapter.insertEvent({
			userId: 'user-3',
			eventType: '2fa_setup_enrolled',
			correlationId: 'corr-3',
			ipHash: 'hash-3',
			userAgent: 'agent',
			method: 'totp',
		});

		const row = getInsertedRow(valuesMock);
		expect(row.method).toBe('totp');
	});

	it('generates a unique UUID per call', async () => {
		const base = {
			userId: 'u',
			eventType: '2fa_setup_enrolled' as const,
			correlationId: 'c',
			ipHash: 'h',
			userAgent: 'a',
		};
		await adapter.insertEvent(base);
		await adapter.insertEvent(base);

		const id1 = getInsertedRow(valuesMock, 0).id;
		const id2 = getInsertedRow(valuesMock, 1).id;
		expect(id1).not.toBe(id2);
	});
});
