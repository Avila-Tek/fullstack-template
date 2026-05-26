import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { TwoFactorActivateUnitOfWorkPort } from '../../application/ports/out/two-factor-activate-unit-of-work.port';
import { deactivateTwoFactor } from '../../application/use-cases/deactivateTwoFactor.use-case';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { auth } from '../better-auth/auth';

@Hook()
@Injectable()
export class TwoFactorDisableHook {
	constructor(
		@Inject(TwoFactorActivateUnitOfWorkPort)
		private readonly uow: TwoFactorActivateUnitOfWorkPort,
	) {}

	@AfterHook('/two-factor/disable')
	async afterDisable(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const result = await auth.api.getSession({ headers: ctx.request.headers });
		if (!result) return;

		const { id: userId } = result.user;
		const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

		try {
			await deactivateTwoFactor(
				{ uow: this.uow, correlationId, ipHash, userAgent },
				{ userId },
			);
		} catch (err: unknown) {
			auditLogger.error({
				level: 'security',
				event: '2fa_deactivate_local_sync_failed',
				userId,
				correlationId,
				err,
			});
		}

		auditLogger.info({
			level: 'security',
			event: '2fa_disabled',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent('2fa_disabled');
	}
}
