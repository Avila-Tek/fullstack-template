import { describe, expect, it, vi } from 'vitest';
import { BusinessProfileNotFoundException } from '../../domain/exceptions/business-profile-not-found.exception';
import { NotificationPreferenceNotFoundException } from '../../domain/exceptions/notification-preference-not-found.exception';
import type { BusinessProfileRepositoryPort } from '../ports/out/business-profile-repository.port';
import type { NotificationPreferenceRepositoryPort } from '../ports/out/notification-preference-repository.port';
import { GetNotificationPreferenceUseCase } from './get-notification-preference.use-case';

const makeProfileRepo = (
	result: { businessProfileId: string } | null = { businessProfileId: 'bp-1' },
): BusinessProfileRepositoryPort =>
	({ findCurrentUserByUserId: vi.fn().mockResolvedValue(result) }) as never;

const makeNotifRepo = (
	result: { emailEnabled: boolean } | null,
): NotificationPreferenceRepositoryPort =>
	({ findByBusinessProfileId: vi.fn().mockResolvedValue(result) }) as never;

describe('GetNotificationPreferenceUseCase', () => {
	it("returns preference='all' when emailEnabled=true", async () => {
		const useCase = new GetNotificationPreferenceUseCase(
			makeProfileRepo(),
			makeNotifRepo({ emailEnabled: true }),
		);
		const result = await useCase.execute('user-1');
		expect(result).toEqual({ preference: 'all' });
	});

	it("returns preference='none' when emailEnabled=false", async () => {
		const useCase = new GetNotificationPreferenceUseCase(
			makeProfileRepo(),
			makeNotifRepo({ emailEnabled: false }),
		);
		const result = await useCase.execute('user-1');
		expect(result).toEqual({ preference: 'none' });
	});

	it('throws NotificationPreferenceNotFoundException when row is missing (data integrity)', async () => {
		const useCase = new GetNotificationPreferenceUseCase(
			makeProfileRepo(),
			makeNotifRepo(null),
		);
		await expect(useCase.execute('user-1')).rejects.toThrow(
			NotificationPreferenceNotFoundException,
		);
	});

	it('throws BusinessProfileNotFoundException when no profile exists', async () => {
		const useCase = new GetNotificationPreferenceUseCase(
			makeProfileRepo(null),
			makeNotifRepo(null),
		);
		await expect(useCase.execute('user-1')).rejects.toThrow(
			BusinessProfileNotFoundException,
		);
	});
});
