import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForceRevokeSessionsCommand } from '../../../src/application/ports/in/force-revoke-sessions.use-case.port';
import type {
	ForceRevokeRepos,
	ForceRevokeUnitOfWorkPort,
} from '../../../src/application/ports/out/force-revoke-unit-of-work.port';
import type { SecurityNotificationPort } from '../../../src/application/ports/out/security-notification.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { ForceRevokeSessionsUseCase } from '../../../src/application/use-cases/force-revoke-sessions.use-case';
import { User } from '../../../src/domain/entities/user.entity';
import { UserNotFoundException } from '../../../src/domain/exceptions/user-not-found.exception';
import { Email } from '../../../src/domain/value-objects/user.value-object';

const TARGET_USER_ID = 'user-target-1';
const ADMIN_USER_ID = 'admin-1';

function makeCommand(
	overrides?: Partial<ForceRevokeSessionsCommand>,
): ForceRevokeSessionsCommand {
	return {
		targetUserId: TARGET_USER_ID,
		platformAdminUserId: ADMIN_USER_ID,
		ipAddress: '10.0.0.1',
		userAgent: 'test-agent',
		...overrides,
	};
}

function makeUser(id = TARGET_USER_ID): User {
	return User.reconstitute({
		id,
		email: Email.create('target@example.com'),
		emailVerified: true,
	});
}

function makeRepos(overrides?: {
	revokeAllForUser?: ReturnType<typeof vi.fn>;
	updateSessionInvalidBefore?: ReturnType<typeof vi.fn>;
	updateTwoFactorEnabled?: ReturnType<typeof vi.fn>;
	findEnabledByUserId?: ReturnType<typeof vi.fn>;
	forceEnableEmail?: ReturnType<typeof vi.fn>;
	log?: ReturnType<typeof vi.fn>;
}) {
	return {
		session: {
			revokeAllForUser:
				overrides?.revokeAllForUser ?? vi.fn().mockResolvedValue(0),
		},
		user: {
			updateSessionInvalidBefore:
				overrides?.updateSessionInvalidBefore ??
				vi.fn().mockResolvedValue(undefined),
			updateTwoFactorEnabled:
				overrides?.updateTwoFactorEnabled ??
				vi.fn().mockResolvedValue(undefined),
		},
		twoFactor: {
			findEnabledByUserId:
				overrides?.findEnabledByUserId ?? vi.fn().mockResolvedValue(null),
			forceEnableEmail:
				overrides?.forceEnableEmail ?? vi.fn().mockResolvedValue(undefined),
		},
		auditLog: {
			log: overrides?.log ?? vi.fn().mockResolvedValue(undefined),
		},
	} as unknown as ForceRevokeRepos;
}

function stubUnitOfWork(
	unitOfWork: { run: ReturnType<typeof vi.fn> },
	repos: ForceRevokeRepos,
): void {
	unitOfWork.run.mockImplementation(
		async (work: (r: ForceRevokeRepos) => Promise<unknown>) => work(repos),
	);
}

describe('ForceRevokeSessionsUseCase', () => {
	let useCase: ForceRevokeSessionsUseCase;
	let userRepo: { findById: ReturnType<typeof vi.fn> };
	let unitOfWork: { run: ReturnType<typeof vi.fn> };
	let notification: {
		sendSessionRevokedNotification: ReturnType<typeof vi.fn>;
	};
	const mockLogger: IStructuredLogger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};

	beforeEach(() => {
		userRepo = { findById: vi.fn() };
		unitOfWork = { run: vi.fn() };
		notification = {
			sendSessionRevokedNotification: vi.fn().mockResolvedValue(undefined),
		};

		useCase = new ForceRevokeSessionsUseCase(
			userRepo as unknown as UserRepositoryPort,
			unitOfWork as unknown as ForceRevokeUnitOfWorkPort,
			notification as unknown as SecurityNotificationPort,
			mockLogger,
		);
	});

	it('returns UserNotFoundException when target user does not exist', async () => {
		userRepo.findById.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(UserNotFoundException);
		}
		expect(unitOfWork.run).not.toHaveBeenCalled();
	});

	it('revokes all sessions and returns count', async () => {
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({ revokeAllForUser: vi.fn().mockResolvedValue(3) }),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sessionsRevokedCount).toBe(3);
			expect(result.data.sessionInvalidBeforeUpdated).toBe(true);
		}
	});

	it('updates sessionInvalidBefore timestamp', async () => {
		const updateSessionInvalidBefore = vi.fn().mockResolvedValue(undefined);
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				updateSessionInvalidBefore,
				findEnabledByUserId: vi
					.fn()
					.mockResolvedValue({ enabled: true, method: 'totp' }),
			}),
		);

		await useCase.execute(makeCommand());

		expect(updateSessionInvalidBefore).toHaveBeenCalledWith(
			TARGET_USER_ID,
			expect.any(Date),
		);
	});

	it('force-enables email 2FA when no active method exists', async () => {
		const forceEnableEmail = vi.fn().mockResolvedValue(undefined);
		const updateTwoFactorEnabled = vi.fn().mockResolvedValue(undefined);
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({ forceEnableEmail, updateTwoFactorEnabled }),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.twoFactorForced).toBe(true);
		}
		expect(forceEnableEmail).toHaveBeenCalledWith(TARGET_USER_ID);
		expect(updateTwoFactorEnabled).toHaveBeenCalledWith(TARGET_USER_ID, true);
	});

	it('does not force 2FA when user already has an enabled method', async () => {
		const forceEnableEmail = vi.fn();
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				revokeAllForUser: vi.fn().mockResolvedValue(1),
				findEnabledByUserId: vi
					.fn()
					.mockResolvedValue({ enabled: true, method: 'totp' }),
				forceEnableEmail,
			}),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.twoFactorForced).toBe(false);
		}
		expect(forceEnableEmail).not.toHaveBeenCalled();
	});

	it('writes audit log with correct event details', async () => {
		const log = vi.fn().mockResolvedValue(undefined);
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				revokeAllForUser: vi.fn().mockResolvedValue(2),
				log,
			}),
		);

		await useCase.execute(makeCommand({ reason: 'compromised account' }));

		expect(log).toHaveBeenCalledWith({
			eventType: 'admin_session_revoked',
			platformAdminUserId: ADMIN_USER_ID,
			targetUserId: TARGET_USER_ID,
			ipAddress: '10.0.0.1',
			userAgent: 'test-agent',
			details: {
				sessionsRevokedCount: 2,
				twoFactorForced: true,
				reason: 'compromised account',
			},
		});
	});

	it('omits reason from audit log when not provided', async () => {
		const log = vi.fn().mockResolvedValue(undefined);
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				findEnabledByUserId: vi
					.fn()
					.mockResolvedValue({ enabled: true, method: 'email' }),
				log,
			}),
		);

		await useCase.execute(makeCommand());

		const logCall = log.mock.calls[0][0];
		expect(logCall.details).not.toHaveProperty('reason');
	});

	it('sends notification email after successful revocation', async () => {
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				revokeAllForUser: vi.fn().mockResolvedValue(1),
			}),
		);

		await useCase.execute(makeCommand());

		expect(notification.sendSessionRevokedNotification).toHaveBeenCalledWith(
			TARGET_USER_ID,
			'target@example.com',
			true,
		);
	});

	it('does not fail when notification email fails', async () => {
		userRepo.findById.mockResolvedValue(makeUser());
		notification.sendSessionRevokedNotification.mockRejectedValue(
			new Error('SMTP down'),
		);
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				revokeAllForUser: vi.fn().mockResolvedValue(1),
				findEnabledByUserId: vi
					.fn()
					.mockResolvedValue({ enabled: true, method: 'totp' }),
			}),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
	});

	it('logs warning and returns error when user not found', async () => {
		userRepo.findById.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'auth.admin.force_revoke_error',
				targetUserId: TARGET_USER_ID,
			}),
			expect.any(String),
		);
	});

	it('returns zero revokedCount when user has no sessions', async () => {
		userRepo.findById.mockResolvedValue(makeUser());
		stubUnitOfWork(
			unitOfWork,
			makeRepos({
				findEnabledByUserId: vi
					.fn()
					.mockResolvedValue({ enabled: true, method: 'totp' }),
			}),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.sessionsRevokedCount).toBe(0);
			expect(result.data.twoFactorForced).toBe(false);
		}
	});
});
