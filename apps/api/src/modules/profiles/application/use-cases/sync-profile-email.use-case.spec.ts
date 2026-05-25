import { describe, expect, it, vi } from 'vitest';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import type { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import { SyncProfileEmailUseCase } from './sync-profile-email.use-case';

const userId = 'a0000000-0000-0000-0000-000000000001';
const email = 'new@example.com';

const makeProfileRepo = (
	overrides?: Partial<
		Pick<
			BusinessProfileRepositoryPort,
			'findCurrentUserByUserId' | 'updateEmail'
		>
	>,
) => ({
	findCurrentUserByUserId: vi.fn().mockResolvedValue({
		businessProfileId: 'bp-uuid',
		legalName: null,
		email: 'old@example.com',
		clientCodeLastFour: '1234',
	}),
	updateEmail: vi.fn().mockResolvedValue(undefined),
	...overrides,
});

describe('SyncProfileEmailUseCase', () => {
	it('throws BusinessProfileNotFoundException when profile not found', async () => {
		const profileRepo = makeProfileRepo({
			findCurrentUserByUserId: vi.fn().mockResolvedValue(null),
		});
		const useCase = new SyncProfileEmailUseCase(
			profileRepo as unknown as BusinessProfileRepositoryPort,
		);

		await expect(useCase.execute({ userId, email })).rejects.toThrow(
			BusinessProfileNotFoundException,
		);
		expect(profileRepo.updateEmail).not.toHaveBeenCalled();
	});

	it('returns { updated: false } and skips updateEmail when email already matches', async () => {
		const profileRepo = makeProfileRepo({
			findCurrentUserByUserId: vi.fn().mockResolvedValue({
				businessProfileId: 'bp-uuid',
				legalName: null,
				email,
				clientCodeLastFour: '1234',
			}),
		});
		const useCase = new SyncProfileEmailUseCase(
			profileRepo as unknown as BusinessProfileRepositoryPort,
		);

		const result = await useCase.execute({ userId, email });

		expect(result).toEqual({ updated: false });
		expect(profileRepo.updateEmail).not.toHaveBeenCalled();
	});

	it('calls updateEmail and returns { updated: true } when email differs', async () => {
		const profileRepo = makeProfileRepo();
		const useCase = new SyncProfileEmailUseCase(
			profileRepo as unknown as BusinessProfileRepositoryPort,
		);

		const result = await useCase.execute({ userId, email });

		expect(result).toEqual({ updated: true });
		expect(profileRepo.updateEmail).toHaveBeenCalledOnce();
		expect(profileRepo.updateEmail).toHaveBeenCalledWith(userId, email);
	});

	it('is idempotent — first call updates, second call with same email is no-op', async () => {
		const profileRepo = makeProfileRepo({
			findCurrentUserByUserId: vi
				.fn()
				.mockResolvedValueOnce({
					businessProfileId: 'bp-uuid',
					legalName: null,
					email: 'old@example.com',
					clientCodeLastFour: '1234',
				})
				.mockResolvedValueOnce({
					businessProfileId: 'bp-uuid',
					legalName: null,
					email,
					clientCodeLastFour: '1234',
				}),
		});
		const useCase = new SyncProfileEmailUseCase(
			profileRepo as unknown as BusinessProfileRepositoryPort,
		);

		const first = await useCase.execute({ userId, email });
		const second = await useCase.execute({ userId, email });

		expect(first).toEqual({ updated: true });
		expect(second).toEqual({ updated: false });
		expect(profileRepo.updateEmail).toHaveBeenCalledOnce();
	});
});
