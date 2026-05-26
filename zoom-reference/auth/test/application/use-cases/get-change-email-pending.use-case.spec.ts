import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEmailPendingPort } from '../../../src/application/ports/out/change-email-pending.port';
import { GetChangeEmailPendingUseCase } from '../../../src/application/use-cases/get-change-email-pending.use-case';

function makePendingPort(
	overrides: Partial<ChangeEmailPendingPort> = {},
): ChangeEmailPendingPort {
	return {
		set: vi.fn(),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn(),
		...overrides,
	} as unknown as ChangeEmailPendingPort;
}

describe('GetChangeEmailPendingUseCase', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns hasPending=false when no pending record exists', async () => {
		const pendingPort = makePendingPort({
			get: vi.fn().mockResolvedValue(null),
		});
		const useCase = new GetChangeEmailPendingUseCase(pendingPort);

		const result = await useCase.execute('user-1');

		expect(pendingPort.get).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({ hasPending: false });
		expect(result).not.toHaveProperty('newEmail');
	});

	it('returns hasPending=true with newEmail when a pending record exists', async () => {
		const pendingPort = makePendingPort({
			get: vi.fn().mockResolvedValue({
				newEmail: 'new@example.com',
				normalizedNewEmail: 'new@example.com',
				oldEmail: 'old@example.com',
				createdAt: '2026-04-30T00:00:00.000Z',
			}),
		});
		const useCase = new GetChangeEmailPendingUseCase(pendingPort);

		const result = await useCase.execute('user-1');

		expect(pendingPort.get).toHaveBeenCalledWith('user-1');
		expect(result).toEqual({
			hasPending: true,
			newEmail: 'new@example.com',
		});
	});

	it('propagates errors when pendingPort.get throws (Redis down)', async () => {
		const redisError = new Error('ECONNREFUSED');
		const pendingPort = makePendingPort({
			get: vi.fn().mockRejectedValue(redisError),
		});
		const useCase = new GetChangeEmailPendingUseCase(pendingPort);

		await expect(useCase.execute('user-1')).rejects.toThrow('ECONNREFUSED');
	});
});
