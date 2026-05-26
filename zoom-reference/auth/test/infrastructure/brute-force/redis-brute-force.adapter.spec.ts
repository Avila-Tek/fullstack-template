/**
 * Unit tests for RedisBruteForceAdapter.
 *
 * Strategy:
 *  - Redis happy path: verify INCR/EXPIRE/GET/DEL calls and return values.
 *  - Redis error path: verify the error propagates (no DB fallback).
 *
 * No NestJS TestBed — adapter is instantiated directly.
 */

import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisBruteForceAdapter } from '../../../src/infrastructure/brute-force/redis-brute-force.adapter';

vi.mock('../../../src/env', () => ({
	env: { BRUTE_FORCE_LOCK_WINDOW_SECONDS: 900 },
}));

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeRedisMock() {
	return {
		incr: vi.fn(),
		expire: vi.fn().mockResolvedValue(1),
		get: vi.fn(),
		del: vi.fn().mockResolvedValue(1),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RedisBruteForceAdapter', () => {
	beforeEach(() => vi.clearAllMocks());

	// -------------------------------------------------------------------------
	// increment()
	// -------------------------------------------------------------------------

	describe('increment()', () => {
		it('calls EXPIRE with lockWindowSeconds when INCR returns 1 (first call)', async () => {
			const redis = makeRedisMock();
			redis.incr.mockResolvedValue(1);

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);
			const result = await adapter.increment('test-key');

			expect(result).toBe(1);
			expect(redis.expire).toHaveBeenCalledWith('test-key', 900);
		});

		it('does NOT call EXPIRE when INCR returns 2 (nth call)', async () => {
			const redis = makeRedisMock();
			redis.incr.mockResolvedValue(2);

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);
			const result = await adapter.increment('test-key');

			expect(result).toBe(2);
			expect(redis.expire).not.toHaveBeenCalled();
		});

		it('propagates the error when Redis throws (no DB fallback)', async () => {
			const redis = makeRedisMock();
			redis.incr.mockRejectedValue(new Error('redis down'));

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);

			await expect(adapter.increment('test-key')).rejects.toThrow('redis down');
		});
	});

	// -------------------------------------------------------------------------
	// getCount()
	// -------------------------------------------------------------------------

	describe('getCount()', () => {
		it('returns parsed integer when Redis returns a string count', async () => {
			const redis = makeRedisMock();
			redis.get.mockResolvedValue('3');

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);
			const result = await adapter.getCount('test-key');

			expect(result).toBe(3);
		});

		it('returns 0 when Redis returns null (key absent)', async () => {
			const redis = makeRedisMock();
			redis.get.mockResolvedValue(null);

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);
			const result = await adapter.getCount('test-key');

			expect(result).toBe(0);
		});

		it('propagates the error when Redis throws (no DB fallback)', async () => {
			const redis = makeRedisMock();
			redis.get.mockRejectedValue(new Error('redis down'));

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);

			await expect(adapter.getCount('test-key')).rejects.toThrow('redis down');
		});
	});

	// -------------------------------------------------------------------------
	// clear()
	// -------------------------------------------------------------------------

	describe('clear()', () => {
		it('calls redis.del with the given key on the happy path', async () => {
			const redis = makeRedisMock();
			redis.del.mockResolvedValue(1);

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);
			await adapter.clear('test-key');

			expect(redis.del).toHaveBeenCalledWith('test-key');
		});

		it('propagates the error when Redis throws (no DB fallback)', async () => {
			const redis = makeRedisMock();
			redis.del.mockRejectedValue(new Error('redis down'));

			const adapter = new RedisBruteForceAdapter(redis as unknown as Redis);

			await expect(adapter.clear('test-key')).rejects.toThrow('redis down');
		});
	});
});
