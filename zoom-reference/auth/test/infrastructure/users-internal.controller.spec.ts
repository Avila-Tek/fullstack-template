import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProvisionUserUseCasePort } from '../../src/application/ports/in/provision-user.use-case.port';
import { UsersInternalController } from '../../src/infrastructure/http/users-internal.controller';

describe('UsersInternalController', () => {
	let provisionUseCase: Pick<ProvisionUserUseCasePort, 'execute'>;
	let controller: UsersInternalController;

	beforeEach(() => {
		provisionUseCase = { execute: vi.fn() };
		controller = new UsersInternalController(
			provisionUseCase as ProvisionUserUseCasePort,
		);
	});

	describe('provision', () => {
		it('returns existing userId when user already exists', async () => {
			vi.mocked(provisionUseCase.execute).mockResolvedValue({
				userId: 'existing-uuid',
				path: 'existing',
			});

			const result = await controller.provision({
				email: 'test@example.com',
			} as never);

			expect(result).toEqual({ userId: 'existing-uuid', path: 'existing' });
			expect(provisionUseCase.execute).toHaveBeenCalledWith('test@example.com');
		});

		it('returns new userId when user is provisioned', async () => {
			vi.mocked(provisionUseCase.execute).mockResolvedValue({
				userId: 'new-uuid',
				path: 'provisioned',
			});

			const result = await controller.provision({
				email: 'new@example.com',
			} as never);

			expect(result).toEqual({ userId: 'new-uuid', path: 'provisioned' });
			expect(provisionUseCase.execute).toHaveBeenCalledWith('new@example.com');
		});

		it('delegates to the use case with the email from the body', async () => {
			vi.mocked(provisionUseCase.execute).mockResolvedValue({
				userId: 'some-uuid',
				path: 'existing',
			});

			await controller.provision({ email: 'delegate@example.com' } as never);

			expect(provisionUseCase.execute).toHaveBeenCalledOnce();
			expect(provisionUseCase.execute).toHaveBeenCalledWith(
				'delegate@example.com',
			);
		});
	});
});
