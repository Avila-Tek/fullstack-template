import type { IStructuredLogger } from '@zoom/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { ListSystemsUseCase } from '../../../src/application/use-cases/list-systems.use-case';
import { System } from '../../../src/domain/entities/system.entity';

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeSystem(id: string): System {
	return System.reconstitute({
		id,
		name: `App ${id}`,
		slug: `app-${id}`,
		apiBaseUrl: 'https://api.example.com',
		accessModel: 'open',
		organizationId: `org-${id}`,
		status: 'active',
		isDeleted: false,
		deletedByUserId: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

function makeSystemRepo(systems: System[] = []): SystemRepositoryPort {
	return {
		findById: vi.fn(),
		findBySlug: vi.fn(),
		findByName: vi.fn(),
		findAll: vi.fn().mockResolvedValue(systems),
		create: vi.fn(),
		update: vi.fn(),
		deactivate: vi.fn(),
		createApiKey: vi.fn(),
		findActiveApiKey: vi.fn(),
		rotateApiKey: vi.fn(),
	} as unknown as SystemRepositoryPort;
}

describe('ListSystemsUseCase', () => {
	let systemRepo: ReturnType<typeof makeSystemRepo>;
	let logger: IStructuredLogger;
	let useCase: ListSystemsUseCase;

	beforeEach(() => {
		systemRepo = makeSystemRepo();
		logger = makeLogger();
		useCase = new ListSystemsUseCase(systemRepo, logger);
	});

	it('returns an empty array when no systems exist', async () => {
		const result = await useCase.execute();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toEqual([]);
	});

	it('returns all systems from the repository', async () => {
		const systems = [makeSystem('1'), makeSystem('2'), makeSystem('3')];
		systemRepo = makeSystemRepo(systems);
		useCase = new ListSystemsUseCase(systemRepo, logger);

		const result = await useCase.execute();

		expect(result.success).toBe(true);
		if (!result.success) return;
		expect(result.data).toHaveLength(3);
		expect(result.data.map((s) => s.id)).toEqual(['1', '2', '3']);
	});

	it('delegates to systemRepo.findAll', async () => {
		await useCase.execute();

		expect(systemRepo.findAll).toHaveBeenCalledOnce();
	});
});
