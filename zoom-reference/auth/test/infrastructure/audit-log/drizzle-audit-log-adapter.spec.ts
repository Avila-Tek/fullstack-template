import { describe, expect, it, vi } from 'vitest';
import { DrizzleAuditLogAdapter } from '../../../src/infrastructure/audit-log/drizzle-audit-log-adapter';
import * as schema from '../../../src/infrastructure/database/db-schema';

function makeDb() {
	const values = vi.fn().mockResolvedValue(undefined);
	const insert = vi.fn().mockReturnValue({ values });
	return { db: { insert }, values };
}

function makeLogger() {
	return {
		warn: vi.fn(),
		error: vi.fn(),
	};
}

describe('DrizzleAuditLogAdapter', () => {
	describe('logSocialAuthEvent', () => {
		it('inserts a row into signupAuditLog with eventType and providerId', async () => {
			const { db, values } = makeDb();
			const logger = makeLogger();
			const adapter = new DrizzleAuditLogAdapter(db as never, logger as never);

			await adapter.logSocialAuthEvent({
				correlationId: 'corr-123',
				eventType: 'social_signup_success',
				providerId: 'google',
				ipHash: 'abc123',
				userAgent: 'TestAgent/1.0',
				userId: 'user-456',
			});

			expect(db.insert).toHaveBeenCalledWith(schema.signupAuditLog);
			expect(values).toHaveBeenCalledWith(
				expect.objectContaining({
					correlationId: 'corr-123',
					eventType: 'social_signup_success',
					providerId: 'google',
					ipHash: 'abc123',
					userAgent: 'TestAgent/1.0',
					userId: 'user-456',
				}),
			);
		});

		it('does not throw when DB insert fails', async () => {
			const values = vi.fn().mockRejectedValue(new Error('DB down'));
			const db = { insert: vi.fn().mockReturnValue({ values }) };
			const logger = makeLogger();
			const adapter = new DrizzleAuditLogAdapter(db as never, logger as never);

			await expect(
				adapter.logSocialAuthEvent({
					correlationId: 'corr-456',
					eventType: 'social_signup_failure',
					providerId: 'google',
					ipHash: 'abc123',
					userAgent: 'TestAgent/1.0',
					failureReason: 'captcha_failed',
				}),
			).resolves.not.toThrow();

			expect(logger.error).toHaveBeenCalled();
		});

		it('omits optional fields when not supplied', async () => {
			const { db, values } = makeDb();
			const logger = makeLogger();
			const adapter = new DrizzleAuditLogAdapter(db as never, logger as never);

			await adapter.logSocialAuthEvent({
				correlationId: 'corr-789',
				eventType: 'social_signup_attempt',
				providerId: 'facebook',
				ipHash: 'hash999',
				userAgent: 'Mozilla/5.0',
			});

			expect(values).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'social_signup_attempt',
					providerId: 'facebook',
					userId: undefined,
					failureReason: undefined,
				}),
			);
		});
	});
});
