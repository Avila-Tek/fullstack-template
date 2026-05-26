import { describe, expect, it, vi } from 'vitest';
import type { ApiKeyHashPort } from '../../../src/application/ports/out/api-key-hash.port';
import { DrizzleSystemKeyAdapter } from '../../../src/infrastructure/system-key/drizzle-system-key.adapter';

function makeHashPort(hash = 'hashed-key'): ApiKeyHashPort {
	return { hash: vi.fn().mockReturnValue(hash) };
}

const RESOLUTION_ROW = {
	systemId: 'sys-uuid-1',
	organizationId: 'org-uuid-1',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
	status: 'active' as const,
};

const SUSPENDED_ROW = { ...RESOLUTION_ROW, status: 'suspended' as const };

function makeDb(rows: Record<string, unknown>[] = []) {
	return {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockReturnValue({
				innerJoin: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue(rows),
					}),
				}),
			}),
		}),
	};
}

describe('DrizzleSystemKeyAdapter', () => {
	describe('resolveSystemId', () => {
		it('returns null when key is not found (no DB row)', async () => {
			const adapter = new DrizzleSystemKeyAdapter(
				makeDb() as never,
				makeHashPort(),
			);
			const result = await adapter.resolveSystemId('unknown-key');
			expect(result).toBeNull();
		});

		it('returns full SystemKeyResolution for a valid active-system key', async () => {
			const adapter = new DrizzleSystemKeyAdapter(
				makeDb([RESOLUTION_ROW]) as never,
				makeHashPort('the-hash'),
			);
			const result = await adapter.resolveSystemId('valid-key');

			expect(result).not.toBeNull();
			expect(result?.systemId).toBe('sys-uuid-1');
			expect(result?.organizationId).toBe('org-uuid-1');
			expect(result?.accessModel).toBe('open');
			expect(result?.apiBaseUrl).toBe('https://api.example.com');
			expect(result?.status).toBe('active');
		});

		it('returns resolution with status=suspended for a suspended system key', async () => {
			const adapter = new DrizzleSystemKeyAdapter(
				makeDb([SUSPENDED_ROW]) as never,
				makeHashPort(),
			);
			const result = await adapter.resolveSystemId('suspended-key');

			expect(result).not.toBeNull();
			expect(result?.status).toBe('suspended');
		});

		it('hashes the raw key via ApiKeyHashPort before querying', async () => {
			const hashPort = makeHashPort('computed-hash');
			const adapter = new DrizzleSystemKeyAdapter(
				makeDb([RESOLUTION_ROW]) as never,
				hashPort,
			);

			await adapter.resolveSystemId('raw-key');

			expect(hashPort.hash).toHaveBeenCalledWith('raw-key');
		});
	});
});
