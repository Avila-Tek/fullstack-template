import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	Hook,
} from '@thallesp/nestjs-better-auth';
import type { TwoFactorAuditLogRepositoryPort } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorAuditLogRepositoryPort as AuditLogToken } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { auth } from '../better-auth/auth';

@Hook()
@Injectable()
export class TwoFactorEnrollmentHook {
	constructor(
		@Inject(AuditLogToken)
		private readonly auditLog: TwoFactorAuditLogRepositoryPort,
	) {}

	@AfterHook('/two-factor/enable')
	async afterEnable(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const result = await auth.api.getSession({ headers: ctx.request.headers });
		if (!result) return;

		const { id: userId } = result.user;
		const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

		recordAuthEvent('2fa_setup_started');

		void this.auditLog
			.insertEvent({
				userId,
				eventType: '2fa_setup_started',
				correlationId,
				ipHash,
				userAgent,
			})
			.catch(() => undefined);

		auditLogger.info({
			level: 'security',
			event: '2fa_setup_started',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
	}
}
