import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { UpdateSystemUseCase } from '../../../src/application/use-cases/update-system.use-case';
import { System } from '../../../src/domain/entities/system.entity';
import { InvalidApiBaseUrlException } from '../../../src/domain/exceptions/invalid-api-base-url.exception';
import { SystemConflictException } from '../../../src/domain/exceptions/system-conflict.exception';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeSystem(
	overrides?: Partial<Parameters<typeof System.reconstitute>[0]>,
): System {
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
		...overrides,
	});
}

function makeSystemRepo(
	existing: System | null = makeSystem(),
): SystemRepositoryPort {
	return {
		findById: vi.fn().mockResolvedValue(existing),
		findBySlug: vi.fn().mockResolvedValue(null),
		findByName: vi.fn().mockResolvedValue(null),
		findAll: vi.fn(),
		create: vi.fn(),
		update: vi.fn().mockResolvedValue(existing ?? makeSystem()),
		deactivate: vi.fn(),
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
	platformAdminUserId: 'admin-1',
	ipAddress: '127.0.0.1',
	userAgent: 'test',
};

describe('UpdateSystemUseCase', () => {
	let systemRepo: ReturnType<typeof makeSystemRepo>;
	let auditLog: ReturnType<typeof makeAuditLog>;
	let logger: IStructuredLogger;
	let useCase: UpdateSystemUseCase;

	beforeEach(() => {
		systemRepo = makeSystemRepo();
		auditLog = makeAuditLog();
		logger = makeLogger();
		useCase = new UpdateSystemUseCase(systemRepo, auditLog, logger);
	});

	describe('system not found', () => {
		it('returns SystemNotFoundException when system does not exist', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new UpdateSystemUseCase(systemRepo, auditLog, logger);

			const result = await useCase.execute({
				...BASE_COMMAND,
				name: 'New Name',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		});

		it('does not call update when system is not found', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new UpdateSystemUseCase(systemRepo, auditLog, logger);

			await useCase.execute({ ...BASE_COMMAND, name: 'New Name' });

			expect(systemRepo.update).not.toHaveBeenCalled();
		});
	});

	describe('apiBaseUrl validation', () => {
		it('returns InvalidApiBaseUrlException for a non-URL string', async () => {
			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'not-a-url',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(InvalidApiBaseUrlException);
		});

		it('returns InvalidApiBaseUrlException for an ftp:// URL', async () => {
			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'ftp://files.example.com',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(InvalidApiBaseUrlException);
		});

		it('accepts an http:// URL', async () => {
			vi.mocked(systemRepo.update).mockResolvedValue(
				makeSystem({ apiBaseUrl: 'http://localhost' }),
			);

			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'http://localhost',
			});

			expect(result.success).toBe(true);
		});
	});

	describe('slug conflict', () => {
		it('returns SystemConflictException when the new slug is taken', async () => {
			vi.mocked(systemRepo.findBySlug).mockResolvedValue(
				makeSystem({ id: 'other' }),
			);

			const result = await useCase.execute({
				...BASE_COMMAND,
				slug: 'taken-slug',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemConflictException);
		});

		it('does not check slug conflict when slug is unchanged', async () => {
			await useCase.execute({ ...BASE_COMMAND, slug: 'my-app' });

			expect(systemRepo.findBySlug).not.toHaveBeenCalled();
		});
	});

	describe('name conflict', () => {
		it('returns SystemConflictException when the new name is taken', async () => {
			vi.mocked(systemRepo.findByName).mockResolvedValue(
				makeSystem({ id: 'other' }),
			);

			const result = await useCase.execute({
				...BASE_COMMAND,
				name: 'Taken Name',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemConflictException);
		});

		it('does not check name conflict when name is unchanged', async () => {
			await useCase.execute({ ...BASE_COMMAND, name: 'My App' });

			expect(systemRepo.findByName).not.toHaveBeenCalled();
		});
	});

	describe('happy path', () => {
		it('calls update with the supplied patch fields', async () => {
			const updated = makeSystem({
				name: 'Renamed',
				apiBaseUrl: 'https://new.example.com',
			});
			vi.mocked(systemRepo.update).mockResolvedValue(updated);

			const result = await useCase.execute({
				...BASE_COMMAND,
				name: 'Renamed',
				apiBaseUrl: 'https://new.example.com',
			});

			expect(result.success).toBe(true);
			expect(systemRepo.update).toHaveBeenCalledWith(
				'system-1',
				expect.objectContaining({
					name: 'Renamed',
					apiBaseUrl: 'https://new.example.com',
				}),
			);
		});

		it('runs slug and name conflict checks in parallel', async () => {
			const callOrder: string[] = [];
			vi.mocked(systemRepo.findBySlug).mockImplementation(async () => {
				callOrder.push('slug');
				return null;
			});
			vi.mocked(systemRepo.findByName).mockImplementation(async () => {
				callOrder.push('name');
				return null;
			});

			await useCase.execute({
				...BASE_COMMAND,
				slug: 'new-slug',
				name: 'New Name',
			});

			// Both must be called (order is non-deterministic in parallel)
			expect(callOrder).toContain('slug');
			expect(callOrder).toContain('name');
			expect(systemRepo.findBySlug).toHaveBeenCalledTimes(1);
			expect(systemRepo.findByName).toHaveBeenCalledTimes(1);
		});

		it('logs a system_updated audit event', async () => {
			await useCase.execute({ ...BASE_COMMAND, name: 'Renamed' });

			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'system_updated',
					platformAdminUserId: 'admin-1',
					systemId: 'system-1',
				}),
			);
		});

		it('returns SystemNotFoundException when the row vanishes between check and update (TOCTOU)', async () => {
			vi.mocked(systemRepo.update).mockResolvedValue(null);

			const result = await useCase.execute({
				...BASE_COMMAND,
				name: 'Renamed',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		});
	});
});
