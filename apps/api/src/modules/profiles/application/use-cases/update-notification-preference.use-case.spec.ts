import { describe, expect, it, vi } from 'vitest';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import type { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import type { NotificationPreferenceRepositoryPort } from '../ports/out/notification-preference-repository.port';
import { UpdateNotificationPreferenceUseCase } from './update-notification-preference.use-case';

const makeProfileRepo = (
	result: { businessProfileId: string } | null = { businessProfileId: 'bp-1' },
): BusinessProfileRepositoryPort =>
	({ findCurrentUserByUserId: vi.fn().mockResolvedValue(result) }) as never;

const makeNotifRepo = (): NotificationPreferenceRepositoryPort =>
	({ upsert: vi.fn().mockResolvedValue(undefined) }) as never;

describe('UpdateNotificationPreferenceUseCase', () => {
	it("calls upsert with emailEnabled=true and returns preference='all' when input is 'all'", async () => {
		const notifRepo = makeNotifRepo();
		const useCase = new UpdateNotificationPreferenceUseCase(
			makeProfileRepo(),
			notifRepo,
		);
		const result = await useCase.execute('user-1', 'all');
		expect(notifRepo.upsert).toHaveBeenCalledWith('bp-1', true);
		expect(result).toEqual({ preference: 'all' });
	});

	it("calls upsert with emailEnabled=false and returns preference='none' when input is 'none'", async () => {
		const notifRepo = makeNotifRepo();
		const useCase = new UpdateNotificationPreferenceUseCase(
			makeProfileRepo(),
			notifRepo,
		);
		const result = await useCase.execute('user-1', 'none');
		expect(notifRepo.upsert).toHaveBeenCalledWith('bp-1', false);
		expect(result).toEqual({ preference: 'none' });
	});

	it('throws BusinessProfileNotFoundException when no profile exists', async () => {
		const useCase = new UpdateNotificationPreferenceUseCase(
			makeProfileRepo(null),
			makeNotifRepo(),
		);
		await expect(useCase.execute('user-1', 'all')).rejects.toThrow(
			BusinessProfileNotFoundException,
		);
	});
});
