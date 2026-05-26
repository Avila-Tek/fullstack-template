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

import { handleAfterEmailVerification } from '../../../src/infrastructure/better-auth/auth';
import { auditLogger } from '../../../src/shared/logger/audit-logger';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockEmailService = {
	sendWelcomeEmail: vi.fn(),
};

const deps = {
	emailService: mockEmailService,
	logger: auditLogger,
};

const user = { id: 'user-abc', email: 'user@example.com' };

describe('handleAfterEmailVerification', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls sendWelcomeEmail with user.email', async () => {
		mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

		await handleAfterEmailVerification(user, deps);

		expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
			'user@example.com',
		);
	});

	it('swallows SMTP failure and logs an error — does not rethrow', async () => {
		const smtpError = new Error('SMTP timeout');
		mockEmailService.sendWelcomeEmail.mockRejectedValue(smtpError);

		await expect(
			handleAfterEmailVerification(user, deps),
		).resolves.toBeUndefined();

		expect(auditLogger.error).toHaveBeenCalledOnce();
	});
});
