import type { IStructuredLogger } from '@zoom/utils';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RedisTwoFactorPendingMethodAdapter } from '../../../src/infrastructure/redis/redis-two-factor-pending-method.adapter';

const USER_ID = 'a0000000-0000-0000-0000-000000000001';
const TTL = 600;

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

describe('RedisTwoFactorPendingMethodAdapter', () => {
	let redis: ReturnType<typeof makeRedisMock>;
	let logger: IStructuredLogger;
	let adapter: RedisTwoFactorPendingMethodAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		redis = makeRedisMock();
		logger = makeLogger();
		adapter = new RedisTwoFactorPendingMethodAdapter(
			redis as unknown as Redis,
			logger,
		);
	});

	// ── set() ─────────────────────────────────────────────────────────────────

	describe('set()', () => {
		it('stores email payload with the correct key and TTL', async () => {
			await adapter.set(USER_ID, { method: 'email' }, TTL);

			expect(redis.set).toHaveBeenCalledOnce();
			expect(redis.set).toHaveBeenCalledWith(
				`auth:2fa-pending-method:${USER_ID}`,
				JSON.stringify({ method: 'email' }),
				'EX',
				TTL,
			);
		});

		it('stores sms payload correctly', async () => {
			await adapter.set(
				USER_ID,
				{ method: 'sms', phoneNumber: '04121234567' },
				TTL,
			);

			expect(redis.set).toHaveBeenCalledWith(
				`auth:2fa-pending-method:${USER_ID}`,
				JSON.stringify({ method: 'sms', phoneNumber: '04121234567' }),
				'EX',
				TTL,
			);
		});
	});

	// ── get() ─────────────────────────────────────────────────────────────────

	describe('get()', () => {
		it('returns parsed email payload from JSON', async () => {
			redis.get.mockResolvedValue(JSON.stringify({ method: 'email' }));

			const result = await adapter.get(USER_ID);

			expect(result).toEqual({ method: 'email' });
			expect(redis.get).toHaveBeenCalledWith(
				`auth:2fa-pending-method:${USER_ID}`,
			);
		});

		it('returns parsed sms payload with phoneNumber from JSON', async () => {
			redis.get.mockResolvedValue(
				JSON.stringify({ method: 'sms', phoneNumber: '04121234567' }),
			);

			const result = await adapter.get(USER_ID);

			expect(result).toEqual({ method: 'sms', phoneNumber: '04121234567' });
		});

		it('returns null when the key does not exist', async () => {
			redis.get.mockResolvedValue(null);

			const result = await adapter.get(USER_ID);

			expect(result).toBeNull();
		});

		it('returns null and logs warn when stored value is neither "email" nor "sms"', async () => {
			redis.get.mockResolvedValue('totp');

			const result = await adapter.get(USER_ID);

			expect(result).toBeNull();
			expect(logger.warn).toHaveBeenCalledOnce();
		});
	});

	// ── delete() ──────────────────────────────────────────────────────────────

	describe('delete()', () => {
		it('removes the key from Redis', async () => {
			await adapter.delete(USER_ID);

			expect(redis.del).toHaveBeenCalledOnce();
			expect(redis.del).toHaveBeenCalledWith(
				`auth:2fa-pending-method:${USER_ID}`,
			);
		});

		it('resolves without throwing when key does not exist', async () => {
			redis.del.mockResolvedValue(0);

			await expect(adapter.delete(USER_ID)).resolves.toBeUndefined();
		});
	});
});
