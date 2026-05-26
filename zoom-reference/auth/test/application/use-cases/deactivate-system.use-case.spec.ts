import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { DeactivateSystemUseCase } from '../../../src/application/use-cases/deactivate-system.use-case';
import { System } from '../../../src/domain/entities/system.entity';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeSystem(): System {
	return System.reconstitute({
		id: 'system-1',
		name: 'My App',
		slug: 'my-app',
		apiBaseUrl: 'https://api.myapp.com',
		accessModel: 'open',
		organizationId: 'org-1',
		status: 'active',
		isDeleted: false,
		deletedByUserId: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

function makeSystemRepo(
	system: System | null = makeSystem(),
): SystemRepositoryPort {
	return {
		findById: vi.fn().mockResolvedValue(system),
		findBySlug: vi.fn(),
		findByName: vi.fn(),
		findAll: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		deactivate: vi.fn().mockResolvedValue(undefined),
		createApiKey: vi.fn(),
		findActiveApiKey: vi.fn(),
		rotateApiKey: vi.fn(),
	} as unknown as SystemRepositoryPort;
}

function makeAuditLog(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

const BASE_COMMAND = {
	systemId: 'system-1',
	platformAdminUserId: 'admin-user-1',
	ipAddress: '127.0.0.1',
	userAgent: 'test-agent',
};

describe('DeactivateSystemUseCase', () => {
	let systemRepo: ReturnType<typeof makeSystemRepo>;
	let auditLog: ReturnType<typeof makeAuditLog>;
	let logger: IStructuredLogger;
	let useCase: DeactivateSystemUseCase;

	beforeEach(() => {
		systemRepo = makeSystemRepo();
		auditLog = makeAuditLog();
		logger = makeLogger();
		useCase = new DeactivateSystemUseCase(systemRepo, auditLog, logger);
	});

	describe('happy path', () => {
		it('deactivates the system via the repository', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(systemRepo.deactivate).toHaveBeenCalledWith(
				'system-1',
				'admin-user-1',
			);
		});

		it('logs a system_deactivated audit event', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'system_deactivated',
					platformAdminUserId: 'admin-user-1',
					systemId: 'system-1',
					ipAddress: '127.0.0.1',
					userAgent: 'test-agent',
				}),
			);
		});

		it('returns null data on success', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			if (!result.success) return;
			expect(result.data).toBeNull();
		});
	});

	describe('system not found', () => {
		it('returns SystemNotFoundException when system does not exist', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new DeactivateSystemUseCase(systemRepo, auditLog, logger);

			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		});

		it('does not call deactivate when system is not found', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new DeactivateSystemUseCase(systemRepo, auditLog, logger);

			await useCase.execute(BASE_COMMAND);

			expect(systemRepo.deactivate).not.toHaveBeenCalled();
		});

		it('does not log an audit event when system is not found', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new DeactivateSystemUseCase(systemRepo, auditLog, logger);

			await useCase.execute(BASE_COMMAND);

			expect(auditLog.log).not.toHaveBeenCalled();
		});
	});
});
