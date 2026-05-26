import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { changePasswordInput } from '@zoom/schemas';
import { APIError } from 'better-auth';
import { AccountRepositoryPort } from '../../application/ports/out/account-repository.port';
import {
	type ChangePasswordAuditEventType,
	ChangePasswordAuditLogPort,
} from '../../application/ports/out/change-password-audit-log.port';
import { PasswordHashServicePort } from '../../application/ports/out/password-hash-service.port';
import { PasswordHistoryRepositoryPort } from '../../application/ports/out/password-history-repository.port';
import { checkPasswordHistory } from '../../application/use-cases/check-password-history.use-case';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import {
	extractHookTelemetry,
	type HookTelemetryFields,
} from '../../shared/utils/hook-telemetry';
import { parseReturnedStatus } from '../../shared/utils/returned-status';
import { validatePasswordComplexity } from '../../shared/utils/validate-password-complexity';
import { auth } from '../better-auth/auth';

interface ChangePasswordCtx extends HookTelemetryFields {
	userId: string;
}

@Hook()
@Injectable()
export class ChangePasswordHook {
	constructor(
		@Inject(PasswordHistoryRepositoryPort)
		private readonly historyRepo: PasswordHistoryRepositoryPort,
		@Inject(PasswordHashServicePort)
		private readonly hashService: PasswordHashServicePort,
		@Inject(ChangePasswordAuditLogPort)
		private readonly auditLog: ChangePasswordAuditLogPort,
		@Inject(AccountRepositoryPort)
		private readonly accountRepo: AccountRepositoryPort,
	) {}

	@BeforeHook('/change-password')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const tf = extractHookTelemetry(ctx);

		const session = await auth.api.getSession({
			headers: ctx.request.headers,
		});
		if (!session) {
			throw new APIError(401, { error: 'unauthorized' });
		}

		const userId = session.user.id;

		const parsed = changePasswordInput.safeParse(ctx.body);
		if (!parsed.success) {
			throw new APIError(422, { error: 'invalid_input' });
		}
		const body = parsed.data;

		const credentialAccount =
			await this.accountRepo.findCredentialAccount(userId);
		if (!credentialAccount?.passwordHash) {
			this.emit('password_change_no_credential_account', 'warn', {
				...tf,
				userId,
			});
			throw new APIError(422, { error: 'no_password_account' });
		}

		const isCurrentValid = await this.hashService.verify(
			credentialAccount.passwordHash,
			body.currentPassword,
		);
		if (!isCurrentValid) {
			this.emit('password_change_invalid_credentials', 'warn', {
				...tf,
				userId,
			});
			throw new APIError(400, { error: 'INVALID_PASSWORD' });
		}

		const complexity = validatePasswordComplexity(body.newPassword);
		if (!complexity.valid) {
			this.emit('password_change_complexity_failed', 'warn', {
				...tf,
				userId,
			});
			throw new APIError(422, {
				error: 'password_policy_failed',
				message: complexity.errors[0],
			});
		}

		const { reused } = await checkPasswordHistory(userId, body.newPassword, {
			passwordHistoryRepo: this.historyRepo,
			passwordHashService: this.hashService,
			historyDepth: env.PASSWORD_HISTORY_DEPTH,
		});
		if (reused) {
			this.emit('password_change_history_violation', 'warn', {
				...tf,
				userId,
			});
			throw new APIError(422, { error: 'password_history_violation' });
		}

		ctx.context.changePasswordCtx = {
			userId,
			...tf,
		} satisfies ChangePasswordCtx;
	}

	@AfterHook('/change-password')
	async after(ctx: AuthHookContext): Promise<void> {
		const changeCtx = ctx.context.changePasswordCtx as
			| ChangePasswordCtx
			| undefined;
		if (!changeCtx) return;

		const { isError, statusCode, errorCode } = parseReturnedStatus(
			ctx.context.returned,
		);
		if (isError) {
			this.emit('password_change_failed', 'warn', changeCtx, {
				statusCode,
				errorCode,
			});
			return;
		}

		this.emit('password_change_succeeded', 'info', changeCtx);
	}

	private emit(
		eventType: ChangePasswordAuditEventType,
		level: 'info' | 'warn',
		tf: HookTelemetryFields & { userId?: string },
		extraDetails?: Record<string, unknown>,
	): void {
		const { correlationId, ipHash, userAgent, userId, ipAddress } = tf;
		const logPayload = {
			level: 'security' as const,
			event: eventType,
			correlationId,
			ipHash,
			userAgent,
			userId,
		};
		if (level === 'warn') auditLogger.warn(logPayload);
		else auditLogger.info(logPayload);
		recordAuthEvent(eventType);
		void this.auditLog
			.log({
				eventType,
				userId,
				ipAddress,
				userAgent,
				details: { correlationId, ...extraDetails },
			})
			.catch(() => undefined);
	}
}
