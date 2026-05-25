import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	Hook,
} from '@thallesp/nestjs-better-auth';
import type { TwoFactorAuditLogRepositoryPort } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorAuditLogRepositoryPort as AuditLogToken } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { hashIp } from '../../shared/utils/hash-ip';
import { resolveClientIp } from '../../shared/utils/resolve-client-ip';
import { auth } from '../better-auth/auth';

@Hook()
@Injectable()
export class TwoFactorSkipHook {
	constructor(
		@Inject(AuditLogToken)
		private readonly auditLog: TwoFactorAuditLogRepositoryPort,
	) {}

	@AfterHook('/two-factor/skip')
	async afterSkip(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const result = await auth.api.getSession({ headers: ctx.request.headers });
		if (!result) return;

		const { id: userId } = result.user;
		const ipHash = hashIp(resolveClientIp(ctx));
		const userAgent = ctx.getHeader('user-agent') ?? '';
		const correlationId =
			ctx.getHeader('x-correlation-id') ?? crypto.randomUUID();

		recordAuthEvent('2fa_enrollment_skipped');

		void this.auditLog
			.insertEvent({
				userId,
				eventType: '2fa_setup_skipped',
				correlationId,
				ipHash,
				userAgent,
			})
			.catch(() => undefined);
	}
}
