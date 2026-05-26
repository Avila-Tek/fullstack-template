import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock declarations — must be at top level for vi.mock hoisting
// ---------------------------------------------------------------------------

vi.mock('../../../src/env', () => ({
	env: { BETTER_AUTH_SECRET: 'test-secret' },
}));

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: {
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks so they resolve the mocked versions)
// ---------------------------------------------------------------------------

import { handleSignOutBefore } from '../../../src/infrastructure/hooks/sign-out.hooks';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeps() {
	const insertEvent = vi.fn().mockResolvedValue(undefined);
	return {
		redis: { del: vi.fn().mockResolvedValue(1) },
		sessionAuditLog: { insertEvent },
	};
}

// ---------------------------------------------------------------------------
// handleSignOutBefore
// ---------------------------------------------------------------------------

describe('handleSignOutBefore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('logs logout_succeeded with userId, sessionId, ipHash, and correlationId', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{
				userId: 'user-xyz',
				sessionId: 'sess-1',
				ipHash: 'sha256hashvalue',
				correlationId: 'corr-abc',
			},
			deps,
		);

		expect(auditLogger.info).toHaveBeenCalledOnce();
		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log.event).toBe('logout_succeeded');
		expect(log.userId).toBe('user-xyz');
		expect(log.sessionId).toBe('sess-1');
		expect(log.ipHash).toBe('sha256hashvalue');
		expect(log.correlationId).toBe('corr-abc');
		expect(log.resultStatus).toBe('success');
	});

	it('deletes the Redis inactivity key', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{ userId: 'u', sessionId: 'sess-2', ipHash: 'h', correlationId: 'c' },
			deps,
		);

		expect(deps.redis.del).toHaveBeenCalledWith('session:sess-2:activity');
	});

	it('inserts a session_logout audit row', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{ userId: 'u', sessionId: 'sess-3', ipHash: 'h', correlationId: 'c' },
			deps,
		);

		expect(deps.sessionAuditLog.insertEvent).toHaveBeenCalledOnce();
		const params = (
			deps.sessionAuditLog.insertEvent as ReturnType<typeof vi.fn>
		).mock.calls[0][0] as Record<string, unknown>;
		expect(params.userId).toBe('u');
		expect(params.sessionId).toBe('sess-3');
		expect(params.eventType).toBe('session_logout');
		expect(params.correlationId).toBe('c');
	});

	it('records logout_succeeded metric', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{ userId: 'u', sessionId: 's', ipHash: 'h', correlationId: 'c' },
			deps,
		);

		expect(recordAuthEvent).toHaveBeenCalledWith('logout_succeeded');
	});

	it('does not log raw IP address', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{
				userId: 'u',
				sessionId: 's',
				ipHash: 'sha256hashvalue',
				correlationId: 'c',
			},
			deps,
		);

		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log).not.toHaveProperty('ip');
		expect(log).not.toHaveProperty('ipAddress');
	});

	it('does not log email or any raw PII', async () => {
		const deps = makeDeps();

		await handleSignOutBefore(
			{ userId: 'u', sessionId: 's', ipHash: 'h', correlationId: 'c' },
			deps,
		);

		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log).not.toHaveProperty('email');
		expect(log).not.toHaveProperty('password');
	});
});
