import { describe, expect, it, vi } from 'vitest';
import { DrizzleSystemMembershipRepository } from '../../../../src/infrastructure/database/repositories/drizzle-system-membership-repository.adapter';

const ROW = {
	id: 'mem-uuid-1',
	systemId: 'sys-1',
	organizationId: 'org-1',
	userId: 'user-1',
	role: 'member' as const,
	status: 'active' as const,
	isDeleted: false,
	createdAt: new Date(),
	updatedAt: new Date(),
};

function makeSelectDb(rows: Record<string, unknown>[] = []) {
	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(rows),
				}),
			}),
		}),
	};
}

function makeInsertDb() {
	return {
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoUpdate: vi.fn().mockResolvedValue([]),
			}),
		}),
	};
}

describe('DrizzleSystemMembershipRepository', () => {
	describe('findByUserAndOrg', () => {
		it('returns null when no membership exists', async () => {
			const repo = new DrizzleSystemMembershipRepository(
				makeSelectDb() as never,
			);
			const result = await repo.findByUserAndOrg('user-1', 'org-1');
			expect(result).toBeNull();
		});

		it('returns a SystemMembershipEntity when membership exists', async () => {
			const repo = new DrizzleSystemMembershipRepository(
				makeSelectDb([ROW]) as never,
			);
			const result = await repo.findByUserAndOrg('user-1', 'org-1');

			expect(result).not.toBeNull();
			expect(result?.id).toBe('mem-uuid-1');
			expect(result?.userId).toBe('user-1');
			expect(result?.organizationId).toBe('org-1');
			expect(result?.role).toBe('member');
			expect(result?.status).toBe('active');
		});
	});

	describe('upsertMember', () => {
		it('calls insert with correct values', async () => {
			const db = makeInsertDb();
			const repo = new DrizzleSystemMembershipRepository(db as never);

			await repo.upsertMember({
				userId: 'user-1',
				systemId: 'sys-1',
				organizationId: 'org-1',
				role: 'member',
			});

			expect(db.insert).toHaveBeenCalledOnce();
			const insertCall = db.insert.mock.results[0].value;
			expect(insertCall.values).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: 'user-1',
					systemId: 'sys-1',
					organizationId: 'org-1',
					role: 'member',
				}),
			);
		});

		it('calls onConflictDoUpdate to make the operation idempotent', async () => {
			const db = makeInsertDb();
			const repo = new DrizzleSystemMembershipRepository(db as never);

			await repo.upsertMember({
				userId: 'user-2',
				systemId: 'sys-2',
				organizationId: 'org-2',
				role: 'admin',
			});

			const valuesCall =
				db.insert.mock.results[0].value.values.mock.results[0].value;
			expect(valuesCall.onConflictDoUpdate).toHaveBeenCalledOnce();
		});
	});
});
