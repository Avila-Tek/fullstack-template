import { describe, expect, it, vi } from 'vitest';
import type { ActiveTermsRecord } from '../../../src/application/ports/out/terms-repository.port';
import { DrizzleTermsRepository } from '../../../src/infrastructure/database/repositories/drizzle-terms-repository.adapter';

vi.mock('../../../src/env', () => ({
	env: { TERMS_CACHE_TTL_SECONDS: 300 },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(
	overrides: Partial<{
		id: string;
		systemId: string;
		version: string;
		title: string;
		content: string;
		effectiveAt: Date;
		status: string;
	}> = {},
): Record<string, unknown> {
	return {
		id: 'term-uuid-1',
		systemId: 'sys-1',
		version: 'v1.0',
		status: 'active',
		title: 'Terms of Service',
		content: '<p>Terms of Service</p>',
		contentHash: null,
		publishedAt: null,
		effectiveAt: new Date('2024-01-01'),
		retiredAt: null,
		createdByUserId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function makeDb(rows: Record<string, unknown>[] = []): {
	select: ReturnType<typeof vi.fn>;
} {
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

function makeRedis(cached: string | null = null): {
	get: ReturnType<typeof vi.fn>;
	set: ReturnType<typeof vi.fn>;
} {
	return {
		get: vi.fn().mockResolvedValue(cached),
		set: vi.fn().mockResolvedValue('OK'),
	};
}

const EXPECTED_RECORD: ActiveTermsRecord = {
	id: 'term-uuid-1',
	version: 'v1.0',
	title: 'Terms of Service',
	content: '<p>Terms of Service</p>',
	effectiveAt: new Date('2024-01-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DbTermsAdapter', () => {
	describe('findActiveBySystemId', () => {
		it('returns cached record when Redis has a cache hit (no DB call)', async () => {
			const db = makeDb();
			const redis = makeRedis(JSON.stringify(EXPECTED_RECORD));
			const adapter = new DrizzleTermsRepository(db as never, redis as never);

			const result = await adapter.findActiveBySystemId('sys-1');

			expect(result).toMatchObject({
				id: 'term-uuid-1',
				version: 'v1.0',
				content: '<p>Terms of Service</p>',
				effectiveAt: new Date('2024-01-01'),
			});
			expect(db.select).not.toHaveBeenCalled();
		});

		it('queries DB on cache miss and populates Redis', async () => {
			const db = makeDb([makeRow()]);
			const redis = makeRedis(null);
			const adapter = new DrizzleTermsRepository(db as never, redis as never);

			const result = await adapter.findActiveBySystemId('sys-1');

			expect(result).toMatchObject({
				id: 'term-uuid-1',
				version: 'v1.0',
				content: '<p>Terms of Service</p>',
				effectiveAt: new Date('2024-01-01'),
			});
			expect(db.select).toHaveBeenCalledOnce();
			expect(redis.set).toHaveBeenCalledWith(
				'terms:active:sys-1',
				expect.any(String),
				'EX',
				expect.any(Number),
			);
		});

		it('returns null when DB has no active record for the system', async () => {
			const db = makeDb([]);
			const redis = makeRedis(null);
			const adapter = new DrizzleTermsRepository(db as never, redis as never);

			const result = await adapter.findActiveBySystemId('sys-1');

			expect(result).toBeNull();
			expect(redis.set).not.toHaveBeenCalled();
		});

		it('falls back to DB when Redis get throws', async () => {
			const db = makeDb([makeRow()]);
			const redis = makeRedis(null);
			redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
			const adapter = new DrizzleTermsRepository(db as never, redis as never);

			const result = await adapter.findActiveBySystemId('sys-1');

			expect(result).toMatchObject({ id: 'term-uuid-1' });
			expect(db.select).toHaveBeenCalledOnce();
		});

		it('still returns record when Redis set throws (cache population is best-effort)', async () => {
			const db = makeDb([makeRow()]);
			const redis = makeRedis(null);
			redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
			const adapter = new DrizzleTermsRepository(db as never, redis as never);

			const result = await adapter.findActiveBySystemId('sys-1');

			expect(result).toMatchObject({ id: 'term-uuid-1' });
		});
	});
});
