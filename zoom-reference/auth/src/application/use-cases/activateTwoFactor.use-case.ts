import type { TwoFactorActivateUnitOfWorkPort } from '../ports/out/two-factor-activate-unit-of-work.port';
import type { TwoFactorInsertParams } from '../ports/out/two-factor-repository.port';

export interface ActivateTwoFactorDeps {
	uow: TwoFactorActivateUnitOfWorkPort;
	correlationId: string;
	ipHash: string;
	userAgent: string;
}

export interface ActivateTwoFactorParams {
	userId: string;
	insertParams: TwoFactorInsertParams;
}

export async function activateTwoFactor(
	deps: ActivateTwoFactorDeps,
	params: ActivateTwoFactorParams,
): Promise<void> {
	const { uow, correlationId, ipHash, userAgent } = deps;
	const { userId, insertParams } = params;

	await uow.run(async (repos) => {
		const current = await repos.twoFactor.findEnabledByUserId(userId);
		const isSwitch = current !== null && current.method !== insertParams.method;

		if (current !== null) {
			await repos.twoFactor.deactivate(userId);
		}

		await repos.twoFactor.insert(userId, insertParams);

		await repos.auditLog.insertEvent({
			eventType: isSwitch ? '2fa_method_switched' : '2fa_activated',
			userId,
			correlationId,
			method: insertParams.method,
			ipHash,
			userAgent,
		});
	});
}
