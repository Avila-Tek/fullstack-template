import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorStatusController } from '../../../src/infrastructure/http/two-factor-status.controller';

const AUTH_USER = { id: 'user-1', sessionId: 'sess-1' };

describe('TwoFactorStatusController', () => {
	let controller: TwoFactorStatusController;
	let mockFindEnabledByUserId: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockFindEnabledByUserId = vi.fn();
		const twoFactorRepo = { findEnabledByUserId: mockFindEnabledByUserId };
		controller = new TwoFactorStatusController(twoFactorRepo as never);
	});

	it('returns 401 when no authenticated user is provided', async () => {
		await expect(controller.getStatus(undefined as never)).rejects.toThrow(
			UnauthorizedException,
		);

		expect(mockFindEnabledByUserId).not.toHaveBeenCalled();
	});

	it('returns enabled=true with method when an active 2FA row exists', async () => {
		mockFindEnabledByUserId.mockResolvedValue({
			id: 'row-1',
			userId: 'user-1',
			method: 'totp',
			enabled: true,
			verifiedAt: new Date(),
		});

		const result = await controller.getStatus(AUTH_USER);

		expect(mockFindEnabledByUserId).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ enabled: true, method: 'totp' });
	});

	it('returns enabled=false with method=null when no active 2FA row exists', async () => {
		mockFindEnabledByUserId.mockResolvedValue(null);

		const result = await controller.getStatus(AUTH_USER);

		expect(mockFindEnabledByUserId).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ enabled: false, method: null });
	});

	it('propagates errors when repository throws', async () => {
		const error = new Error('DB connection failed');
		mockFindEnabledByUserId.mockRejectedValue(error);

		await expect(controller.getStatus(AUTH_USER)).rejects.toThrow(
			'DB connection failed',
		);
	});
});
