import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListSystemMembersCommand } from '../../../src/application/ports/in/list-system-members.use-case.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { ListSystemMembersUseCase } from '../../../src/application/use-cases/list-system-members.use-case';
import { System } from '../../../src/domain/entities/system.entity';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';

const SYSTEM_ID = 'sys-1';
const ORG_ID = 'org-1';

function makeSystem(): System {
	return System.reconstitute({
		id: SYSTEM_ID,
		name: 'Test System',
		slug: 'test-system',
		apiBaseUrl: 'https://example.com',
		accessModel: 'restricted',
		organizationId: ORG_ID,
		status: 'active',
		isDeleted: false,
		deletedByUserId: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

function makeCommand(
	overrides?: Partial<ListSystemMembersCommand>,
): ListSystemMembersCommand {
	return {
		systemId: SYSTEM_ID,
		pagination: { page: 1, perPage: 20 },
		...overrides,
	};
}

describe('ListSystemMembersUseCase', () => {
	let useCase: ListSystemMembersUseCase;
	let systemRepo: { findById: ReturnType<typeof vi.fn> };
	let membershipRepo: { findAllBySystem: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		systemRepo = { findById: vi.fn().mockResolvedValue(makeSystem()) };
		membershipRepo = {
			findAllBySystem: vi.fn().mockResolvedValue({
				count: 0,
				items: [],
				pageInfo: {
					currentPage: 1,
					perPage: 20,
					itemCount: 0,
					pageCount: 0,
					hasPreviousPage: false,
					hasNextPage: false,
				},
			}),
		};

		useCase = new ListSystemMembersUseCase(
			systemRepo as unknown as SystemRepositoryPort,
			membershipRepo as unknown as SystemMembershipRepositoryPort,
		);
	});

	it('returns paginated members when members exist', async () => {
		const createdAt = new Date();
		membershipRepo.findAllBySystem.mockResolvedValue({
			count: 1,
			items: [
				{
					userId: 'u-1',
					email: 'alice@example.com',
					role: 'member',
					activated: true,
					createdAt,
				},
			],
			pageInfo: {
				currentPage: 1,
				perPage: 20,
				itemCount: 1,
				pageCount: 1,
				hasPreviousPage: false,
				hasNextPage: false,
			},
		});

		const command = makeCommand();
		const result = await useCase.execute(command);

		expect(membershipRepo.findAllBySystem).toHaveBeenCalledOnce();
		expect(membershipRepo.findAllBySystem).toHaveBeenCalledWith(
			command.systemId,
			command.pagination,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0]).toMatchObject({
				userId: 'u-1',
				email: 'alice@example.com',
				role: 'member',
				activated: true,
			});
			expect(result.data.count).toBe(1);
		}
	});

	it('returns empty items when no members exist', async () => {
		const command = makeCommand();
		const result = await useCase.execute(command);

		expect(membershipRepo.findAllBySystem).toHaveBeenCalledOnce();
		expect(membershipRepo.findAllBySystem).toHaveBeenCalledWith(
			command.systemId,
			command.pagination,
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.items).toHaveLength(0);
			expect(result.data.count).toBe(0);
		}
	});

	it('returns SystemNotFoundException when system not found', async () => {
		systemRepo.findById.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		}
	});
});
