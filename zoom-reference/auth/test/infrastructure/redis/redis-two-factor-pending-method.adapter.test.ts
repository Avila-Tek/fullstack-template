import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorPendingMethodPort } from '../../../src/application/ports/out/two-factor-pending-method.port';
import { RedisTwoFactorPendingMethodAdapter } from '../../../src/infrastructure/redis/redis-two-factor-pending-method.adapter';

const mockRedis = {
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn(),
};

const mockLogger = {
	warn: vi.fn(),
	error: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
};

describe('RedisTwoFactorPendingMethodAdapter', () => {
	let adapter: TwoFactorPendingMethodPort;

	beforeEach(() => {
		vi.clearAllMocks();
		adapter = new RedisTwoFactorPendingMethodAdapter(
			mockRedis as never,
			mockLogger as never,
		);
	});

	describe('set', () => {
		it('stores email method as JSON without phoneNumber', async () => {
			await adapter.set('user-1', { method: 'email' }, 300);

			expect(mockRedis.set).toHaveBeenCalledWith(
				'auth:2fa-pending-method:user-1',
				JSON.stringify({ method: 'email' }),
				'EX',
				300,
			);
		});

		it('stores sms method as JSON with phoneNumber', async () => {
			await adapter.set(
				'user-1',
				{ method: 'sms', phoneNumber: '04121234567' },
				300,
			);

			expect(mockRedis.set).toHaveBeenCalledWith(
				'auth:2fa-pending-method:user-1',
				JSON.stringify({ method: 'sms', phoneNumber: '04121234567' }),
				'EX',
				300,
			);
		});
	});

	describe('get', () => {
		it('returns null when key does not exist', async () => {
			mockRedis.get.mockResolvedValue(null);

			const result = await adapter.get('user-1');

			expect(result).toBeNull();
		});

		it('parses JSON payload with method only', async () => {
			mockRedis.get.mockResolvedValue(JSON.stringify({ method: 'email' }));

			const result = await adapter.get('user-1');

			expect(result).toEqual({ method: 'email' });
		});

		it('parses JSON payload with method and phoneNumber', async () => {
			mockRedis.get.mockResolvedValue(
				JSON.stringify({ method: 'sms', phoneNumber: '04121234567' }),
			);

			const result = await adapter.get('user-1');

			expect(result).toEqual({ method: 'sms', phoneNumber: '04121234567' });
		});

		it('returns null and warns for plain-string values', async () => {
			mockRedis.get.mockResolvedValue('email');

			const result = await adapter.get('user-1');

			expect(result).toBeNull();
			expect(mockLogger.warn).toHaveBeenCalledOnce();
		});

		it('returns null and logs warning for invalid stored value', async () => {
			mockRedis.get.mockResolvedValue('invalid-value');

			const result = await adapter.get('user-1');

			expect(result).toBeNull();
			expect(mockLogger.warn).toHaveBeenCalled();
		});

		it('returns null and logs warning for malformed JSON', async () => {
			mockRedis.get.mockResolvedValue('{ broken json');

			const result = await adapter.get('user-1');

			expect(result).toBeNull();
			expect(mockLogger.warn).toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('deletes the key from Redis', async () => {
			await adapter.delete('user-1');

			expect(mockRedis.del).toHaveBeenCalledWith(
				'auth:2fa-pending-method:user-1',
			);
		});
	});
});
