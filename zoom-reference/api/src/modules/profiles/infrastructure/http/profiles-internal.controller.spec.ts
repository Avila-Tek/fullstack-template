import { describe, expect, it, vi } from 'vitest';
import type { SyncProfileEmailUseCasePort } from '../../application/ports/in/sync-profile-email.use-case.port';
import { ProfilesInternalController } from './profiles-internal.controller';

// Stub factory — only the syncProfileEmail use case is exercised here.
// Guard behavior (403 on missing x-service-secret) is covered by InternalServiceGuard's own tests.
function makeController(
	syncUseCase: Partial<SyncProfileEmailUseCasePort>,
): ProfilesInternalController {
	return new ProfilesInternalController(
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		{} as never,
		syncUseCase as SyncProfileEmailUseCasePort,
	);
}

describe('ProfilesInternalController — syncProfileEmail', () => {
	it('delegates to SyncProfileEmailUseCasePort and returns { updated: false } on no-op', async () => {
		const execute = vi.fn().mockResolvedValue({ updated: false });
		const controller = makeController({ execute });

		const result = await controller.syncProfileEmail({
			userId: 'a0000000-0000-0000-0000-000000000001',
			email: 'same@example.com',
		} as never);

		expect(execute).toHaveBeenCalledOnce();
		expect(result).toEqual({ updated: false });
	});

	it('delegates to SyncProfileEmailUseCasePort and returns { updated: true } on update', async () => {
		const execute = vi.fn().mockResolvedValue({ updated: true });
		const controller = makeController({ execute });

		const result = await controller.syncProfileEmail({
			userId: 'a0000000-0000-0000-0000-000000000001',
			email: 'new@example.com',
		} as never);

		expect(execute).toHaveBeenCalledOnce();
		expect(result).toEqual({ updated: true });
	});

	it('propagates exceptions thrown by the use case (e.g. BusinessProfileNotFoundException)', async () => {
		const execute = vi
			.fn()
			.mockRejectedValue(new Error('PROFILES_BUSINESS_PROFILE_NOT_FOUND'));
		const controller = makeController({ execute });

		await expect(
			controller.syncProfileEmail({
				userId: 'a0000000-0000-0000-0000-000000000001',
				email: 'any@example.com',
			} as never),
		).rejects.toThrow('PROFILES_BUSINESS_PROFILE_NOT_FOUND');
	});
});
