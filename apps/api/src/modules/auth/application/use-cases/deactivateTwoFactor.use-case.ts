import type { TwoFactorActivateUnitOfWorkPort } from '../ports/out/two-factor-activate-unit-of-work.port';

export interface DeactivateTwoFactorDeps {
	uow: TwoFactorActivateUnitOfWorkPort;
	correlationId: string;
	ipHash: string;
	userAgent: string;
}

export interface DeactivateTwoFactorParams {
	userId: string;
}

export async function deactivateTwoFactor(
	deps: DeactivateTwoFactorDeps,
	params: DeactivateTwoFactorParams,
): Promise<void> {
	const { uow, correlationId, ipHash, userAgent } = deps;
	const { userId } = params;

	await uow.run(async (repos) => {
		await repos.twoFactor.deactivate(userId);

		await repos.auditLog.insertEvent({
			eventType: '2fa_deactivated',
			userId,
			correlationId,
			ipHash,
			userAgent,
		});
	});
}
