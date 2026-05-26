import type { IStructuredLogger } from '@zoom/utils';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemContext } from '../../../src/application/ports/out/system-key-service.port';
import { RedisOAuthSystemContextStoreAdapter } from '../../../src/infrastructure/redis/redis-oauth-system-context-store.adapter';

const CORRELATION_ID = 'corr-00000000-0000-0000-0000-000000000001';
const TTL = 600;

const SYSTEM_CTX: SystemContext = {
	systemId: 'sys-001',
	organizationId: 'org-001',
	accessModel: 'open',
	apiBaseUrl: 'https://api.example.com',
};

function makeRedisMock() {
	return {
		set: vi.fn().mockResolvedValue('OK'),
		get: vi.fn().mockResolvedValue(null),
		getdel: vi.fn().mockResolvedValue(JSON.stringify(SYSTEM_CTX)),
		del: vi.fn().mockResolvedValue(1),
	};
}

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};
}

describe('RedisOAuthSystemContextStoreAdapter', () => {
	let redis: ReturnType<typeof makeRedisMock>;
	let logger: IStructuredLogger;
	let adapter: RedisOAuthSystemContextStoreAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		redis = makeRedisMock();
		logger = makeLogger();
		adapter = new RedisOAuthSystemContextStoreAdapter(
			redis as unknown as Redis,
			logger,
		);
	});

	// -- set() ----------------------------------------------------------------

	describe('set()', () => {
		it('stores system context with the correct key and TTL', async () => {
			await adapter.set(CORRELATION_ID, SYSTEM_CTX);

			expect(redis.set).toHaveBeenCalledOnce();
			expect(redis.set).toHaveBeenCalledWith(
				`auth:oauth-system-ctx:${CORRELATION_ID}`,
				JSON.stringify(SYSTEM_CTX),
				'EX',
				TTL,
			);
		});

		it('propagates Redis errors and logs them', async () => {
			redis.set.mockRejectedValue(new Error('Redis down'));

			await expect(adapter.set(CORRELATION_ID, SYSTEM_CTX)).rejects.toThrow(
				'Redis down',
			);
			expect(logger.error).toHaveBeenCalledOnce();
		});
	});

	// -- get() ----------------------------------------------------------------

	describe('get()', () => {
		it('returns parsed SystemContext from JSON', async () => {
			redis.get.mockResolvedValue(JSON.stringify(SYSTEM_CTX));

			const result = await adapter.get(CORRELATION_ID);

			expect(result).toEqual(SYSTEM_CTX);
			expect(redis.get).toHaveBeenCalledWith(
				`auth:oauth-system-ctx:${CORRELATION_ID}`,
			);
		});

		it('returns null when the key does not exist', async () => {
			redis.get.mockResolvedValue(null);
			const result = await adapter.get(CORRELATION_ID);
			expect(result).toBeNull();
		});

		it('propagates Redis errors and logs them', async () => {
			redis.get.mockRejectedValue(new Error('Redis down'));

			await expect(adapter.get(CORRELATION_ID)).rejects.toThrow('Redis down');
			expect(logger.error).toHaveBeenCalledOnce();
		});
	});

	// -- consume() ------------------------------------------------------------

	describe('consume()', () => {
		it('returns parsed SystemContext and deletes the key atomically', async () => {
			const result = await adapter.consume(CORRELATION_ID);

			expect(result).toEqual(SYSTEM_CTX);
			expect(redis.getdel).toHaveBeenCalledOnce();
			expect(redis.getdel).toHaveBeenCalledWith(
				`auth:oauth-system-ctx:${CORRELATION_ID}`,
			);
		});

		it('returns null when the key does not exist', async () => {
			redis.getdel.mockResolvedValue(null);

			const result = await adapter.consume(CORRELATION_ID);
			expect(result).toBeNull();
		});

		it('propagates Redis errors and logs them', async () => {
			redis.getdel.mockRejectedValue(new Error('Redis down'));

			await expect(adapter.consume(CORRELATION_ID)).rejects.toThrow(
				'Redis down',
			);
			expect(logger.error).toHaveBeenCalledOnce();
		});
	});
});
