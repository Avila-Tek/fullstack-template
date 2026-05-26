import { describe, expect, it, vi } from 'vitest';
import type { AuthDb } from '../../../../src/infrastructure/database/drizzle.module';
import { DrizzleUserTermsAcceptanceRepository } from '../../../../src/infrastructure/database/repositories/drizzle-user-terms-acceptance-repository.adapter';

function makeDb(rows: Record<string, unknown>[] = []) {
	const whereSpy = vi.fn().mockReturnValue({
		orderBy: vi.fn().mockReturnValue({
			limit: vi.fn().mockResolvedValue(rows),
		}),
	});

	const db = {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({ where: whereSpy }),
		}),
		insert: vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
			}),
		}),
	} as unknown as AuthDb;

	return { db, whereSpy };
}

const acceptedAt = new Date('2025-01-15T10:00:00Z');

describe('DrizzleUserTermsAcceptanceRepository.findLatestByUserAndSystem()', () => {
	it('returns { systemTermsId, acceptedAt } when a row is found', async () => {
		const { db, whereSpy } = makeDb([
			{ systemTermsId: 'terms-uuid-1', acceptedAt },
		]);
		const repo = new DrizzleUserTermsAcceptanceRepository(db);

		const result = await repo.findLatestByUserAndSystem('user-1', 'sys-1');

		expect(result).toEqual({ systemTermsId: 'terms-uuid-1', acceptedAt });
		expect(whereSpy).toHaveBeenCalledOnce();
	});

	it('returns null when no row is found', async () => {
		const { db, whereSpy } = makeDb([]);
		const repo = new DrizzleUserTermsAcceptanceRepository(db);

		const result = await repo.findLatestByUserAndSystem('user-x', 'sys-x');

		expect(result).toBeNull();
		expect(whereSpy).toHaveBeenCalledOnce();
	});
});
