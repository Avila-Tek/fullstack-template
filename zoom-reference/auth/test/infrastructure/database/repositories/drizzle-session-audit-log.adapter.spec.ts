import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleSessionAuditLogRepository } from '../../../../src/infrastructure/database/repositories/drizzle-session-audit-log.adapter';

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

describe('DrizzleSessionAuditLogRepository', () => {
	let repo: DrizzleSessionAuditLogRepository;
	let insertMock: ReturnType<typeof vi.fn>;
	let valuesMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		const mocks = buildMockDb();
		insertMock = mocks.insertMock;
		valuesMock = mocks.valuesMock;
		repo = new DrizzleSessionAuditLogRepository(mocks.db as never);
	});

	it('calls db.insert(sessionAuditLog).values() with required fields', async () => {
		await repo.insertEvent({
			userId: 'user-1',
			sessionId: 'sess-1',
			eventType: 'jwt_refresh_succeeded',
			correlationId: 'corr-1',
		});

		expect(insertMock).toHaveBeenCalledOnce();
		expect(valuesMock).toHaveBeenCalledOnce();
		const row = getInsertedRow(valuesMock);

		expect(row.userId).toBe('user-1');
		expect(row.sessionId).toBe('sess-1');
		expect(row.eventType).toBe('jwt_refresh_succeeded');
		expect(row.correlationId).toBe('corr-1');
		expect(typeof row.id).toBe('string');
		expect(row.id as string).toMatch(UUID_REGEX);
	});

	it('defaults optional fields to null when not provided', async () => {
		await repo.insertEvent({
			userId: 'user-2',
			eventType: 'session_logout',
			correlationId: 'corr-2',
		});

		const row = getInsertedRow(valuesMock);
		expect(row.sessionId).toBeNull();
		expect(row.systemId).toBeNull();
		expect(row.ipAddress).toBeNull();
		expect(row.userAgent).toBeNull();
		expect(row.failureReason).toBeNull();
	});

	it('passes systemId when provided', async () => {
		await repo.insertEvent({
			userId: 'user-3',
			eventType: 'session_logout',
			correlationId: 'corr-3',
			systemId: 'sys-1',
		});

		const row = getInsertedRow(valuesMock);
		expect(row.systemId).toBe('sys-1');
	});

	it('generates a unique UUID for each call', async () => {
		await repo.insertEvent({
			userId: 'u',
			eventType: 'session_logout',
			correlationId: 'c',
		});
		await repo.insertEvent({
			userId: 'u',
			eventType: 'session_logout',
			correlationId: 'c',
		});

		const id1 = getInsertedRow(valuesMock, 0).id;
		const id2 = getInsertedRow(valuesMock, 1).id;
		expect(id1).not.toBe(id2);
	});
});
