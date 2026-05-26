import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DrizzleChangeEmailAuditLogAdapter } from '../../../../src/infrastructure/database/repositories/drizzle-change-email-audit-log.adapter';

function buildMockDb(
	valuesImpl: () => Promise<unknown> = () => Promise.resolve(undefined),
) {
	const valuesMock = vi.fn().mockImplementation(valuesImpl);
	const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
	return { db: { insert: insertMock }, insertMock, valuesMock };
}

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};
}

describe('DrizzleChangeEmailAuditLogAdapter', () => {
	let adapter: DrizzleChangeEmailAuditLogAdapter;
	let valuesMock: ReturnType<typeof vi.fn>;
	let logger: IStructuredLogger;

	beforeEach(() => {
		const mocks = buildMockDb();
		valuesMock = mocks.valuesMock;
		logger = makeLogger();
		adapter = new DrizzleChangeEmailAuditLogAdapter(mocks.db as never, logger);
	});

	it('writes expected columns to securityAuditLog', async () => {
		await adapter.log({
			eventType: 'email_change_initiated',
			userId: 'user-1',
			ipAddress: '1.2.3.4',
			userAgent: 'ua',
			details: { correlationId: 'c1' },
		});

		expect(valuesMock).toHaveBeenCalledOnce();
		const row = valuesMock.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(row.eventType).toBe('email_change_initiated');
		expect(row.targetUserId).toBe('user-1');
		expect(row.ipAddress).toBe('1.2.3.4');
		expect(row.userAgent).toBe('ua');
		expect(row.details).toEqual({ correlationId: 'c1' });
		expect(row.platformAdminUserId).toBeNull();
		expect(row.systemId).toBeNull();
		expect(row.keyPrefix).toBeNull();
		expect(typeof row.id).toBe('string');
	});

	it('defaults optional fields to null when not provided', async () => {
		await adapter.log({ eventType: 'email_change_failed' });

		const row = valuesMock.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(row.targetUserId).toBeNull();
		expect(row.ipAddress).toBeNull();
		expect(row.userAgent).toBeNull();
		expect(row.details).toBeNull();
	});

	it('catches DB errors and logs a warning without throwing', async () => {
		const { db } = buildMockDb(() =>
			Promise.reject(new Error('connection refused')),
		);
		adapter = new DrizzleChangeEmailAuditLogAdapter(db as never, logger);

		await expect(
			adapter.log({ eventType: 'email_change_initiated', userId: 'u1' }),
		).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledOnce();
		const [ctx, msg] = (logger.warn as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(msg).toBe('change_email_audit_log_failed');
		expect((ctx as Record<string, unknown>).eventType).toBe(
			'email_change_initiated',
		);
	});
});
