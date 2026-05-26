import { describe, expect, it, vi } from 'vitest';
import { DrizzleTermsRepository } from '../../../../src/infrastructure/database/repositories/drizzle-terms-repository.adapter';

function makeDb(rows: Record<string, unknown>[] = []) {
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

function makeRedis() {
	return {
		get: vi.fn().mockResolvedValue(null),
		set: vi.fn().mockResolvedValue('OK'),
	};
}

describe('DrizzleTermsRepository.findById()', () => {
	it('returns { id, version } when a matching row is found', async () => {
		const db = makeDb([
			{
				id: 'term-uuid-1',
				version: 'v1.0',
				systemId: 'sys-1',
				status: 'active',
				title: 'Terms',
				content: '',
				contentHash: null,
				publishedAt: null,
				effectiveAt: new Date('2024-01-01'),
				retiredAt: null,
				createdByUserId: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		const redis = makeRedis();
		const adapter = new DrizzleTermsRepository(db as never, redis as never);

		const result = await adapter.findById('term-uuid-1');

		expect(result).toEqual({ id: 'term-uuid-1', version: 'v1.0' });
	});

	it('returns null when no row matches', async () => {
		const db = makeDb([]);
		const redis = makeRedis();
		const adapter = new DrizzleTermsRepository(db as never, redis as never);

		const result = await adapter.findById('nonexistent');

		expect(result).toBeNull();
	});
});
