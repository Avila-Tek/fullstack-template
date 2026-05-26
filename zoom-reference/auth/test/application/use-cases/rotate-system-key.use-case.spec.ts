import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiKeyHashPort } from '../../../src/application/ports/out/api-key-hash.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { RotateSystemKeyUseCase } from '../../../src/application/use-cases/rotate-system-key.use-case';
import { System } from '../../../src/domain/entities/system.entity';
import { SystemInactiveException } from '../../../src/domain/exceptions/system-inactive.exception';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeActiveSystem(
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
	system: System | null = makeActiveSystem(),
): SystemRepositoryPort {
	return {
		findById: vi.fn().mockResolvedValue(system),
		findBySlug: vi.fn(),
		findByName: vi.fn(),
		findAll: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		deactivate: vi.fn(),
		createApiKey: vi.fn(),
		findActiveApiKey: vi.fn(),
		rotateApiKey: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemRepositoryPort;
}

function makeAuditLog(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

function makeApiKeyHash(): ApiKeyHashPort {
	return {
		hash: vi.fn().mockReturnValue('a'.repeat(64)),
	} as unknown as ApiKeyHashPort;
}

const BASE_COMMAND = {
	systemId: 'system-1',
	platformAdminUserId: 'admin-user-1',
	ipAddress: '127.0.0.1',
	userAgent: 'test-agent',
};

describe('RotateSystemKeyUseCase', () => {
	let systemRepo: ReturnType<typeof makeSystemRepo>;
	let auditLog: ReturnType<typeof makeAuditLog>;
	let apiKeyHash: ReturnType<typeof makeApiKeyHash>;
	let logger: IStructuredLogger;
	let useCase: RotateSystemKeyUseCase;

	beforeEach(() => {
		systemRepo = makeSystemRepo();
		auditLog = makeAuditLog();
		apiKeyHash = makeApiKeyHash();
		logger = makeLogger();
		useCase = new RotateSystemKeyUseCase(
			systemRepo,
			auditLog,
			apiKeyHash,
			logger,
		);
	});

	describe('happy path', () => {
		it('returns a new raw API key (64 hex chars) with a matching 8-char prefix', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.data.rawApiKey).toHaveLength(64);
			expect(result.data.keyPrefix).toHaveLength(8);
			expect(result.data.rawApiKey.startsWith(result.data.keyPrefix)).toBe(
				true,
			);
		});

		it('calls rotateApiKey with the correct systemId and new key material', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(systemRepo.rotateApiKey).toHaveBeenCalledWith(
				'system-1',
				expect.objectContaining({
					systemId: 'system-1',
					keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
					keyPrefix: expect.stringMatching(/^[a-f0-9]{8}$/),
				}),
			);
		});

		it('logs a system_key_rotated audit event with the key prefix', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'system_key_rotated',
					platformAdminUserId: 'admin-user-1',
					systemId: 'system-1',
					keyPrefix: expect.stringMatching(/^[a-f0-9]{8}$/),
					ipAddress: '127.0.0.1',
					userAgent: 'test-agent',
				}),
			);
		});

		it('generates a different key on each call', async () => {
			const result1 = await useCase.execute(BASE_COMMAND);
			const result2 = await useCase.execute(BASE_COMMAND);

			expect(result1.success && result2.success).toBe(true);
			if (!result1.success || !result2.success) return;

			expect(result1.data.rawApiKey).not.toBe(result2.data.rawApiKey);
		});
	});

	describe('system not found', () => {
		it('returns SystemNotFoundException when system does not exist', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new RotateSystemKeyUseCase(
				systemRepo,
				auditLog,
				apiKeyHash,
				logger,
			);

			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		});

		it('does not call rotateApiKey when system is not found', async () => {
			systemRepo = makeSystemRepo(null);
			useCase = new RotateSystemKeyUseCase(
				systemRepo,
				auditLog,
				apiKeyHash,
				logger,
			);

			await useCase.execute(BASE_COMMAND);

			expect(systemRepo.rotateApiKey).not.toHaveBeenCalled();
		});
	});

	describe('suspended system', () => {
		it('returns SystemInactiveException when system is suspended', async () => {
			systemRepo = makeSystemRepo(makeActiveSystem({ status: 'suspended' }));
			useCase = new RotateSystemKeyUseCase(
				systemRepo,
				auditLog,
				apiKeyHash,
				logger,
			);

			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemInactiveException);
		});

		it('does not rotate the key for a suspended system', async () => {
			systemRepo = makeSystemRepo(makeActiveSystem({ status: 'suspended' }));
			useCase = new RotateSystemKeyUseCase(
				systemRepo,
				auditLog,
				apiKeyHash,
				logger,
			);

			await useCase.execute(BASE_COMMAND);

			expect(systemRepo.rotateApiKey).not.toHaveBeenCalled();
		});
	});
});
