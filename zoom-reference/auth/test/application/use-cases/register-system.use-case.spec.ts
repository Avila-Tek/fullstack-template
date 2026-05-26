import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiKeyHashPort } from '../../../src/application/ports/out/api-key-hash.port';
import type { BetterAuthOrgPort } from '../../../src/application/ports/out/better-auth-org.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { RegisterSystemUseCase } from '../../../src/application/use-cases/register-system.use-case';
import type { System } from '../../../src/domain/entities/system.entity';
import type { SystemApiKey } from '../../../src/domain/entities/system-api-key.entity';
import { InvalidApiBaseUrlException } from '../../../src/domain/exceptions/invalid-api-base-url.exception';
import { SystemConflictException } from '../../../src/domain/exceptions/system-conflict.exception';

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeSystemRepo(): SystemRepositoryPort {
	return {
		findById: vi.fn(),
		findBySlug: vi.fn().mockResolvedValue(null),
		findByName: vi.fn().mockResolvedValue(null),
		findAll: vi.fn(),
		create: vi.fn().mockResolvedValue({} as System),
		update: vi.fn(),
		deactivate: vi.fn(),
		createApiKey: vi.fn().mockResolvedValue({} as SystemApiKey),
		findActiveApiKey: vi.fn(),
		rotateApiKey: vi.fn(),
	} as unknown as SystemRepositoryPort;
}

function makeOrgPort(): BetterAuthOrgPort {
	return {
		createOrganization: vi
			.fn()
			.mockResolvedValue({ organizationId: 'org-123' }),
	} as unknown as BetterAuthOrgPort;
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
	platformAdminUserId: 'admin-user-1',
	name: 'My App',
	slug: 'my-app',
	apiBaseUrl: 'https://api.myapp.com',
	accessModel: 'open' as const,
	ipAddress: '127.0.0.1',
	userAgent: 'test-agent',
};

describe('RegisterSystemUseCase', () => {
	let systemRepo: ReturnType<typeof makeSystemRepo>;
	let orgPort: ReturnType<typeof makeOrgPort>;
	let auditLog: ReturnType<typeof makeAuditLog>;
	let apiKeyHash: ReturnType<typeof makeApiKeyHash>;
	let logger: IStructuredLogger;
	let useCase: RegisterSystemUseCase;

	beforeEach(() => {
		systemRepo = makeSystemRepo();
		orgPort = makeOrgPort();
		auditLog = makeAuditLog();
		apiKeyHash = makeApiKeyHash();
		logger = makeLogger();
		useCase = new RegisterSystemUseCase(
			systemRepo,
			orgPort,
			auditLog,
			apiKeyHash,
			logger,
		);
	});

	describe('happy path', () => {
		it('creates a BA organization, system record, and API key', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(orgPort.createOrganization).toHaveBeenCalledWith(
				'My App',
				'my-app',
				'admin-user-1',
			);
			expect(systemRepo.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'My App',
					slug: 'my-app',
					apiBaseUrl: 'https://api.myapp.com',
					accessModel: 'open',
					organizationId: 'org-123',
				}),
			);
			expect(systemRepo.createApiKey).toHaveBeenCalledWith(
				expect.objectContaining({ systemId: expect.any(String) }),
			);
		});

		it('returns a raw API key (64 hex chars) with a matching 8-char prefix', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			if (!result.success) return;

			expect(result.data.rawApiKey).toHaveLength(64);
			expect(result.data.keyPrefix).toHaveLength(8);
			expect(result.data.rawApiKey.startsWith(result.data.keyPrefix)).toBe(
				true,
			);
		});

		it('logs a system_registered audit event', async () => {
			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(true);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'system_registered',
					platformAdminUserId: 'admin-user-1',
					ipAddress: '127.0.0.1',
					userAgent: 'test-agent',
				}),
			);
		});

		it('generates a unique systemId on each call', async () => {
			const result1 = await useCase.execute(BASE_COMMAND);
			const result2 = await useCase.execute(BASE_COMMAND);

			expect(result1.success && result2.success).toBe(true);
			if (!result1.success || !result2.success) return;

			expect(result1.data.systemId).not.toBe(result2.data.systemId);
		});
	});

	describe('apiBaseUrl validation', () => {
		it('rejects a non-URL string', async () => {
			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'not-a-url',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(InvalidApiBaseUrlException);
		});

		it('rejects an ftp:// URL', async () => {
			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'ftp://files.example.com',
			});

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(InvalidApiBaseUrlException);
		});

		it('accepts an http:// URL', async () => {
			const result = await useCase.execute({
				...BASE_COMMAND,
				apiBaseUrl: 'http://localhost:3000',
			});

			expect(result.success).toBe(true);
		});

		it('does not create the organization when the URL is invalid', async () => {
			await useCase.execute({ ...BASE_COMMAND, apiBaseUrl: 'invalid' });

			expect(orgPort.createOrganization).not.toHaveBeenCalled();
		});
	});

	describe('slug / name conflict detection', () => {
		it('returns SystemConflictException when slug already exists', async () => {
			vi.mocked(systemRepo.findBySlug).mockResolvedValue({} as System);

			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemConflictException);
		});

		it('returns SystemConflictException when name already exists', async () => {
			vi.mocked(systemRepo.findByName).mockResolvedValue({} as System);

			const result = await useCase.execute(BASE_COMMAND);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(SystemConflictException);
		});

		it('does not create the organization on conflict', async () => {
			vi.mocked(systemRepo.findBySlug).mockResolvedValue({} as System);

			await useCase.execute(BASE_COMMAND);

			expect(orgPort.createOrganization).not.toHaveBeenCalled();
		});
	});
});
