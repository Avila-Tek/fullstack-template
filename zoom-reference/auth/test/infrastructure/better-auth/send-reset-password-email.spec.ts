import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import type { PasswordResetAuditLogPort } from '../../../src/application/ports/out/password-reset-audit-log.port';
import { handleSendResetPasswordEmail } from '../../../src/infrastructure/better-auth/auth';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const mockEmailService = {
	sendPasswordResetEmail: vi.fn(),
};

const mockAuditLog: PasswordResetAuditLogPort = {
	log: vi.fn().mockResolvedValue(undefined),
};

const deps = {
	emailService: mockEmailService,
	logger: auditLogger,
	auditLog: mockAuditLog,
};

async function flushMicrotasks(): Promise<void> {
	await new Promise((resolve) => setImmediate(resolve));
}

describe('handleSendResetPasswordEmail (fire-and-forget)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns synchronously without awaiting SMTP', () => {
		mockEmailService.sendPasswordResetEmail.mockImplementation(
			() => new Promise(() => {}), // never resolves
		);

		const result = handleSendResetPasswordEmail(
			'user@example.com',
			'https://reset.me',
			deps,
		);

		expect(result).toBeUndefined();
	});

	it('logs, records metric and audits password_reset_email_sent on SMTP success', async () => {
		mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

		handleSendResetPasswordEmail('user@example.com', 'https://reset.me', deps);
		await flushMicrotasks();

		expect(auditLogger.info).toHaveBeenCalledOnce();
		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log.event).toBe('password_reset_email_sent');
		expect(log.emailHash).toBeDefined();
		expect(log.email).toBeUndefined();
		expect(recordAuthEvent).toHaveBeenCalledWith('password_reset_email_sent');
		expect(mockAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'password_reset_email_sent' }),
		);
	});

	it('logs, records failure metric and audits password_reset_email_send_failed on SMTP failure', async () => {
		mockEmailService.sendPasswordResetEmail.mockRejectedValue(
			new Error('SMTP refused'),
		);

		handleSendResetPasswordEmail('user@example.com', 'https://reset.me', deps);
		await flushMicrotasks();

		expect(auditLogger.error).toHaveBeenCalledOnce();
		expect(recordAuthEvent).toHaveBeenCalledWith(
			'password_reset_email_send_failed',
		);
		expect(mockAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'password_reset_email_send_failed',
			}),
		);
	});
});
