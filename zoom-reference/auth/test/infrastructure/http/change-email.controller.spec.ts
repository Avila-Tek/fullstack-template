import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeEmailController } from '../../../src/infrastructure/http/change-email.controller';

const mockExecute = vi.fn();

const useCasePort = { execute: mockExecute };

const AUTH_USER = { id: 'user-1', sessionId: 'sess-1' };

describe('ChangeEmailController', () => {
	let controller: ChangeEmailController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new ChangeEmailController(useCasePort as never);
	});

	it('returns 401 when no authenticated user is provided', async () => {
		await expect(
			controller.getPendingStatus(undefined as never),
		).rejects.toThrow(UnauthorizedException);

		expect(mockExecute).not.toHaveBeenCalled();
	});

	it('returns hasPending=false when use case reports no pending request', async () => {
		mockExecute.mockResolvedValue({ hasPending: false });

		const result = await controller.getPendingStatus(AUTH_USER);

		expect(mockExecute).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ hasPending: false });
	});

	it('returns hasPending=true with newEmail when use case reports a pending request', async () => {
		mockExecute.mockResolvedValue({
			hasPending: true,
			newEmail: 'new@example.com',
		});

		const result = await controller.getPendingStatus(AUTH_USER);

		expect(mockExecute).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({
			hasPending: true,
			newEmail: 'new@example.com',
		});
	});

	it('propagates errors when use case throws', async () => {
		const error = new Error('Redis connection failed');
		mockExecute.mockRejectedValue(error);

		await expect(controller.getPendingStatus(AUTH_USER)).rejects.toThrow(
			'Redis connection failed',
		);
	});
});
