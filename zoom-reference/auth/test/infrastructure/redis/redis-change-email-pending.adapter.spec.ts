import type { IStructuredLogger } from '@zoom/utils';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEmailPending } from '../../../src/application/ports/out/change-email-pending.port';
import { RedisChangeEmailPendingAdapter } from '../../../src/infrastructure/redis/redis-change-email-pending.adapter';

const USER_ID = 'a0000000-0000-0000-0000-000000000001';
const TTL = 86400;

const SAMPLE_RECORD: ChangeEmailPending = {
	newEmail: 'new@example.com',
	normalizedNewEmail: 'new@example.com',
	oldEmail: 'old@example.com',
	createdAt: '2024-01-01T00:00:00.000Z',
};

function makeRedisMock() {
	return {
		set: vi.fn().mockResolvedValue('OK'),
		get: vi.fn().mockResolvedValue(null),
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

describe('RedisChangeEmailPendingAdapter', () => {
	let redis: ReturnType<typeof makeRedisMock>;
	let logger: IStructuredLogger;
	let adapter: RedisChangeEmailPendingAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		redis = makeRedisMock();
		logger = makeLogger();
		adapter = new RedisChangeEmailPendingAdapter(
			redis as unknown as Redis,
			logger,
		);
	});

	// ── set() ────────────────────────────────────────────────────────────────

	describe('set()', () => {
		it('writes JSON-serialised record with the correct key and TTL', async () => {
			await adapter.set(USER_ID, SAMPLE_RECORD, TTL);

			expect(redis.set).toHaveBeenCalledOnce();
			expect(redis.set).toHaveBeenCalledWith(
				`auth:change-email-pending:${USER_ID}`,
				JSON.stringify(SAMPLE_RECORD),
				'EX',
				TTL,
			);
		});

		it('overwrites any existing record (OQ-03 invalidation)', async () => {
			await adapter.set(USER_ID, SAMPLE_RECORD, TTL);
			const updated: ChangeEmailPending = {
				...SAMPLE_RECORD,
				newEmail: 'other@example.com',
			};
			await adapter.set(USER_ID, updated, TTL);

			expect(redis.set).toHaveBeenCalledTimes(2);
			const secondCall = redis.set.mock.calls[1];
			expect(secondCall?.[1]).toBe(JSON.stringify(updated));
		});
	});

	// ── get() ────────────────────────────────────────────────────────────────

	describe('get()', () => {
		it('returns the parsed record when the key exists', async () => {
			redis.get.mockResolvedValue(JSON.stringify(SAMPLE_RECORD));

			const result = await adapter.get(USER_ID);

			expect(result).toEqual(SAMPLE_RECORD);
			expect(redis.get).toHaveBeenCalledWith(
				`auth:change-email-pending:${USER_ID}`,
			);
		});

		it('returns null when the key does not exist', async () => {
			redis.get.mockResolvedValue(null);

			const result = await adapter.get(USER_ID);

			expect(result).toBeNull();
		});

		it('returns null and logs a warning when the stored value is malformed JSON', async () => {
			redis.get.mockResolvedValue('not-valid-json{{{');

			const result = await adapter.get(USER_ID);

			expect(result).toBeNull();
			expect(logger.warn).toHaveBeenCalledOnce();
		});
	});

	// ── delete() ─────────────────────────────────────────────────────────────

	describe('delete()', () => {
		it('removes the pending record key from Redis', async () => {
			await adapter.delete(USER_ID);

			expect(redis.del).toHaveBeenCalledOnce();
			expect(redis.del).toHaveBeenCalledWith(
				`auth:change-email-pending:${USER_ID}`,
			);
		});

		it('resolves without throwing when the key does not exist in Redis', async () => {
			redis.del.mockResolvedValue(0);

			await expect(adapter.delete(USER_ID)).resolves.toBeUndefined();
			expect(redis.del).toHaveBeenCalledOnce();
		});
	});
});
