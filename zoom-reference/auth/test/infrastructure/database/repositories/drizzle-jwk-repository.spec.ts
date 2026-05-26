import { describe, expect, it, vi } from 'vitest';
import { DrizzleJwkRepository } from '../../../../src/infrastructure/database/repositories/drizzle-jwk-repository.adapter';

// The Drizzle select chain supports both:
//   await select().from().where().orderBy()            ← getAllVerificationKeys
//   await select().from().where().orderBy().limit(1)   ← getActiveKey
// makeDb wires both by returning an orderBy result that is itself a promise
// (so it can be awaited directly) and also exposes a .limit() method.
function makeDb(rows: Record<string, unknown>[] = []) {
	const limit = vi.fn().mockResolvedValue(rows);
	const orderByResult = Object.assign(Promise.resolve(rows), { limit });
	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockReturnValue(orderByResult),
				}),
			}),
		}),
	};
}

// Row shape mirrors the Better Auth `jwks` table.
const ROW = {
	id: 'key-id-1',
	publicKey: JSON.stringify({ kty: 'RSA', n: 'pubN', e: 'AQAB' }),
	privateKey: JSON.stringify({ kty: 'RSA', d: 'private' }),
	createdAt: new Date(),
	expiresAt: null,
};

describe('DrizzleJwkRepository', () => {
	describe('getActiveKey', () => {
		it('returns null when no active key exists', async () => {
			const repo = new DrizzleJwkRepository(makeDb() as never);
			const result = await repo.getActiveKey();
			expect(result).toBeNull();
		});

		it('returns a JwkEntity when an active key exists', async () => {
			const repo = new DrizzleJwkRepository(makeDb([ROW]) as never);
			const result = await repo.getActiveKey();

			expect(result).not.toBeNull();
			expect(result?.id).toBe('key-id-1');
			// kid mirrors the row id (Better Auth uses id as key identifier)
			expect(result?.kid).toBe('key-id-1');
			expect(result?.algorithm).toBe('ES256');
			// publicJwk and privateJwk are the raw strings from the DB
			expect(typeof result?.publicJwk).toBe('string');
			expect(typeof result?.privateJwk).toBe('string');
		});

		it('excludes expiresAt from the entity (only key fields returned)', async () => {
			const repo = new DrizzleJwkRepository(makeDb([ROW]) as never);
			const result = await repo.getActiveKey();
			expect(result).not.toHaveProperty('expiresAt');
		});
	});

	describe('getAllVerificationKeys', () => {
		it('returns an empty array when no keys exist', async () => {
			const repo = new DrizzleJwkRepository(makeDb() as never);
			const result = await repo.getAllVerificationKeys();
			expect(result).toEqual([]);
		});

		it('returns all active keys as JwkEntity objects', async () => {
			const second = { ...ROW, id: 'key-id-2' };
			const repo = new DrizzleJwkRepository(makeDb([ROW, second]) as never);
			const result = await repo.getAllVerificationKeys();

			expect(result).toHaveLength(2);
			expect(result[0]?.id).toBe('key-id-1');
			expect(result[1]?.id).toBe('key-id-2');
			expect(typeof result[0]?.publicJwk).toBe('string');
			expect(typeof result[0]?.privateJwk).toBe('string');
		});

		it('excludes expiresAt from each entity', async () => {
			const repo = new DrizzleJwkRepository(makeDb([ROW]) as never);
			const [key] = await repo.getAllVerificationKeys();
			expect(key).not.toHaveProperty('expiresAt');
		});
	});
});
