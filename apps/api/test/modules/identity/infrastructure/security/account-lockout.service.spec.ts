import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountLockoutService } from '@/modules/identity/infrastructure/security/account-lockout.service';

interface RedisMock {
	eval: ReturnType<typeof vi.fn>;
	del: ReturnType<typeof vi.fn>;
	exists: ReturnType<typeof vi.fn>;
}

function makeRedisMock(): RedisMock {
	return {
		eval: vi.fn().mockResolvedValue(1),
		del: vi.fn().mockResolvedValue(1),
		exists: vi.fn().mockResolvedValue(0),
	};
}

describe('AccountLockoutService', () => {
	let redis: RedisMock;
	let service: AccountLockoutService;

	beforeEach(() => {
		redis = makeRedisMock();
		service = new AccountLockoutService(redis as never);
	});

	describe('recordFailure', () => {
		it('calls eval with both keys, TTL, and threshold args', async () => {
			await service.recordFailure('user@example.com');

			expect(redis.eval).toHaveBeenCalledOnce();
			const args = redis.eval.mock.calls[0] as unknown[];
			const [script, numkeys, failKey, blockedKey, ttl, threshold] = args as [
				string,
				number,
				string,
				string,
				string,
				string,
			];
			expect(script).toContain('INCR');
			expect(numkeys).toBe(2);
			expect(failKey).toContain('account_lockout_failures:');
			expect(blockedKey).toContain('account_lockout_blocked:');
			expect(ttl).toBe('900');
			expect(threshold).toBe('10');
		});

		it('normalizes email before key derivation', async () => {
			await service.recordFailure('  USER@EXAMPLE.COM  ');

			const args = redis.eval.mock.calls[0] as [string, number, string, string, ...unknown[]];
			const failKey = args[2];
			expect(failKey).toBe('account_lockout_failures:user@example.com');
		});
	});

	describe('isLocked', () => {
		it('returns false when exists returns 0', async () => {
			redis.exists.mockResolvedValue(0);
			const result = await service.isLocked('user@example.com');
			expect(result).toBe(false);
		});

		it('returns true when exists returns 1', async () => {
			redis.exists.mockResolvedValue(1);
			const result = await service.isLocked('user@example.com');
			expect(result).toBe(true);
		});

		it('checks the blocked key with normalized email', async () => {
			await service.isLocked('  USER@EXAMPLE.COM  ');

			expect(redis.exists).toHaveBeenCalledWith(
				'account_lockout_blocked:user@example.com',
			);
		});
	});

	describe('recordSuccess', () => {
		it('calls del with both failure and blocked keys', async () => {
			await service.recordSuccess('user@example.com');

			expect(redis.del).toHaveBeenCalledOnce();
			const [failKey, blockedKey] = redis.del.mock.calls[0] as [string, string];
			expect(failKey).toBe('account_lockout_failures:user@example.com');
			expect(blockedKey).toBe('account_lockout_blocked:user@example.com');
		});

		it('normalizes email before key derivation', async () => {
			await service.recordSuccess('  USER@EXAMPLE.COM  ');

			const [failKey] = redis.del.mock.calls[0] as [string];
			expect(failKey).toBe('account_lockout_failures:user@example.com');
		});
	});
});
