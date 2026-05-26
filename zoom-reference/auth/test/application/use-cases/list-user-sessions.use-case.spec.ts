import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	SessionDto,
	SessionRepositoryPort,
} from '../../../src/application/ports/out/session-repository.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { ListUserSessionsUseCase } from '../../../src/application/use-cases/list-user-sessions.use-case';
import { User } from '../../../src/domain/entities/user.entity';
import { UserNotFoundException } from '../../../src/domain/exceptions/user-not-found.exception';
import { Email } from '../../../src/domain/value-objects/user.value-object';

const TARGET_USER_ID = 'user-1';

function makeUser(id = TARGET_USER_ID): User {
	return User.reconstitute({
		id,
		email: Email.create('user@example.com'),
		emailVerified: true,
	});
}

function makeSession(overrides?: Partial<SessionDto>): SessionDto {
	return {
		id: 'sess-1',
		userId: TARGET_USER_ID,
		createdAt: new Date('2026-01-01'),
		expiresAt: new Date('2026-01-02'),
		ipAddress: '10.0.0.1',
		userAgent: 'Chrome',
		activeOrganizationId: null,
		...overrides,
	};
}

describe('ListUserSessionsUseCase', () => {
	let useCase: ListUserSessionsUseCase;
	let userRepo: { findById: ReturnType<typeof vi.fn> };
	let sessionRepo: { findAllForUser: ReturnType<typeof vi.fn> };
	let auditLog: { log: ReturnType<typeof vi.fn> };
	const mockLogger: IStructuredLogger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};

	beforeEach(() => {
		userRepo = { findById: vi.fn() };
		sessionRepo = { findAllForUser: vi.fn() };
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };

		useCase = new ListUserSessionsUseCase(
			userRepo as unknown as UserRepositoryPort,
			sessionRepo as unknown as SessionRepositoryPort,
			auditLog as unknown as SystemAuditLogPort,
			mockLogger,
		);
	});

	it('returns UserNotFoundException when target user does not exist', async () => {
		userRepo.findById.mockResolvedValue(null);

		const result = await useCase.execute({
			targetUserId: TARGET_USER_ID,
			callerUserId: 'admin-1',
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(UserNotFoundException);
		}
		expect(sessionRepo.findAllForUser).not.toHaveBeenCalled();
	});

	it('returns empty array when user has no sessions', async () => {
		userRepo.findById.mockResolvedValue(makeUser());
		sessionRepo.findAllForUser.mockResolvedValue([]);

		const result = await useCase.execute({
			targetUserId: TARGET_USER_ID,
			callerUserId: 'admin-1',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual([]);
		}
	});

	it('returns all sessions for the user', async () => {
		const sessions = [
			makeSession({ id: 'sess-1' }),
			makeSession({ id: 'sess-2', ipAddress: '10.0.0.2' }),
		];
		userRepo.findById.mockResolvedValue(makeUser());
		sessionRepo.findAllForUser.mockResolvedValue(sessions);

		const result = await useCase.execute({
			targetUserId: TARGET_USER_ID,
			callerUserId: 'admin-1',
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toHaveLength(2);
			expect(result.data[0].id).toBe('sess-1');
			expect(result.data[1].id).toBe('sess-2');
		}
		expect(sessionRepo.findAllForUser).toHaveBeenCalledWith(TARGET_USER_ID);
	});
});
