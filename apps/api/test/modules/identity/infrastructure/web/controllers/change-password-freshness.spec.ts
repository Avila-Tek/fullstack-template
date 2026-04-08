import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SessionNotFreshException } from '@/modules/identity/domain/exceptions/session-not-fresh.exception';
import { ChangePasswordController } from '@/modules/identity/infrastructure/web/controllers/change-password.controller';

const mockUseCase = { execute: vi.fn() };

function makeController(): ChangePasswordController {
	return new ChangePasswordController(mockUseCase as never);
}

function makeSession(ageMs: number): { user: { id: string }; session: { createdAt: Date } } {
	return {
		user: { id: 'user-1' },
		session: { createdAt: new Date(Date.now() - ageMs) },
	};
}

describe('ChangePasswordController — session freshness', () => {
	it('throws UnauthorizedException when session is null', async () => {
		const controller = makeController();
		await expect(
			controller.execute(null, { currentPassword: 'old', newPassword: 'New123!@#' }),
		).rejects.toThrow(UnauthorizedException);
	});

	it('throws SessionNotFreshException when session is older than 5 minutes', async () => {
		const controller = makeController();
		const staleSession = makeSession(6 * 60 * 1000); // 6 minutes old
		await expect(
			controller.execute(staleSession, { currentPassword: 'old', newPassword: 'New123!@#' }),
		).rejects.toThrow(SessionNotFreshException);
	});

	it('proceeds when session is fresh (< 5 minutes old)', async () => {
		mockUseCase.execute.mockResolvedValueOnce({ success: true, data: null });
		const controller = makeController();
		const freshSession = makeSession(2 * 60 * 1000); // 2 minutes old
		const result = await controller.execute(freshSession, {
			currentPassword: 'old',
			newPassword: 'New123!@#',
		});
		expect(result).toBeNull();
		expect(mockUseCase.execute).toHaveBeenCalledWith('user-1', 'old', 'New123!@#');
	});

	it('throws SessionNotFreshException exactly at the 5-minute boundary', async () => {
		const controller = makeController();
		const boundarySession = makeSession(5 * 60 * 1000 + 1); // 1ms over boundary
		await expect(
			controller.execute(boundarySession, { currentPassword: 'old', newPassword: 'New123!@#' }),
		).rejects.toThrow(SessionNotFreshException);
	});
});
