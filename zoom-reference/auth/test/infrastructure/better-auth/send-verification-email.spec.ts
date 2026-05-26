import { normalizeEmail } from '@zoom/utils';
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
		error: vi.fn(),
	},
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks so they resolve the mocked versions)
// ---------------------------------------------------------------------------

import { handleSendVerificationEmail } from '../../../src/infrastructure/better-auth/auth';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';
import { sha256Hex } from '../../../src/shared/utils/sha256-hex';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockEmailService = {
	sendVerificationEmail: vi.fn(),
};

const deps = {
	emailService: mockEmailService,
	logger: auditLogger,
};

describe('handleSendVerificationEmail', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('logs verification_email_sent and records metric on SMTP success', async () => {
		mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

		await handleSendVerificationEmail(
			'user@example.com',
			'https://verify.me',
			deps,
		);

		expect(auditLogger.info).toHaveBeenCalledOnce();
		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log.event).toBe('verification_email_sent');
		expect(log.emailHash).toBe(sha256Hex(normalizeEmail('user@example.com')));

		expect(recordAuthEvent).toHaveBeenCalledWith('verification_email_sent');
	});

	it('logs error and records metric on delivery failure without rethrowing', async () => {
		const deliveryError = new Error('Email delivery failed');
		mockEmailService.sendVerificationEmail.mockRejectedValue(deliveryError);

		await handleSendVerificationEmail(
			'user@example.com',
			'https://verify.me',
			deps,
		);

		expect(auditLogger.error).toHaveBeenCalledOnce();
		expect(recordAuthEvent).toHaveBeenCalledWith(
			'verification_email_send_failed',
		);
	});
});
