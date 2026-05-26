import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { changeEmailInput } from '@zoom/schemas';
import { normalizeEmail } from '@zoom/utils';
import { APIError } from 'better-auth';
import { AccountRepositoryPort } from '../../application/ports/out/account-repository.port';
import { ChangeEmailAuditLogPort } from '../../application/ports/out/change-email-audit-log.port';
import { ChangeEmailPendingPort } from '../../application/ports/out/change-email-pending.port';
import { PasswordHashServicePort } from '../../application/ports/out/password-hash-service.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import {
	type EmitChangeEmailTelemetryFields,
	emitChangeEmailTelemetry,
} from '../../shared/utils/emit-change-email-telemetry';
import {
	extractHookTelemetry,
	type HookTelemetryFields,
} from '../../shared/utils/hook-telemetry';
import { parseReturnedStatus } from '../../shared/utils/returned-status';
import { auth } from '../better-auth/auth';

interface ChangeEmailCtx extends HookTelemetryFields {
	userId: string;
	oldEmail: string;
	newEmail: string;
	normalizedNewEmail: string;
}

@Hook()
@Injectable()
export class ChangeEmailHook {
	constructor(
		@Inject(AccountRepositoryPort)
		private readonly accountRepo: AccountRepositoryPort,
		@Inject(UserRepositoryPort)
		private readonly userRepo: UserRepositoryPort,
		@Inject(PasswordHashServicePort)
		private readonly hashService: PasswordHashServicePort,
		@Inject(ChangeEmailPendingPort)
		private readonly pendingPort: ChangeEmailPendingPort,
		@Inject(ChangeEmailAuditLogPort)
		private readonly auditLog: ChangeEmailAuditLogPort,
	) {}

	@BeforeHook('/change-email')
	async before(ctx: AuthHookContext): Promise<unknown> {
		if (!ctx.request) return;

		const tf = extractHookTelemetry(ctx);

		const session = await auth.api.getSession({ headers: ctx.request.headers });
		if (!session) throw new APIError(401, { error: 'unauthorized' });

		const userId = session.user.id;
		const oldEmail = session.user.email;
		const currentNormalizedEmail = normalizeEmail(session.user.email);

		const parsed = changeEmailInput.safeParse(ctx.body);
		if (!parsed.success) throw new APIError(422, { error: 'invalid_input' });

		const body = parsed.data;

		if (normalizeEmail(body.newEmail) === currentNormalizedEmail) {
			throw new APIError(422, { error: 'same_email' });
		}

		const account = await this.accountRepo.findCredentialAccount(userId);
		if (!account?.passwordHash) {
			this.emit('email_change_no_password_account', 'warn', { ...tf, userId });
			throw new APIError(422, { error: 'no_password_account' });
		}

		const isValid = await this.hashService.verify(
			account.passwordHash,
			body.currentPassword,
		);
		if (!isValid) {
			this.emit('email_change_invalid_credentials', 'warn', { ...tf, userId });
			throw new APIError(400, { error: 'invalid_credentials' });
		}

		const normalizedNewEmail = normalizeEmail(body.newEmail);
		const existingUser =
			await this.userRepo.findByNormalizedEmail(normalizedNewEmail);
		if (existingUser && existingUser.id !== userId) {
			this.emit('email_change_collision_silent', 'warn', { ...tf, userId });
			return ctx.json({ status: true });
		}

		ctx.context.changeEmailCtx = {
			userId,
			oldEmail,
			newEmail: body.newEmail,
			normalizedNewEmail,
			...tf,
		} satisfies ChangeEmailCtx;

		const ttlSeconds = env.VERIFICATION_TOKEN_TTL_HOURS * 3600;
		try {
			await this.pendingPort.set(
				userId,
				{
					newEmail: body.newEmail,
					normalizedNewEmail,
					oldEmail,
					createdAt: new Date().toISOString(),
				},
				ttlSeconds,
			);
		} catch (err: unknown) {
			const errMessage = err instanceof Error ? err.message : String(err);
			auditLogger.error(
				{
					event: 'email_change_pending_write_failed',
					userId,
					error: errMessage,
				},
				'Failed to write pending change-email record',
			);
			throw new APIError(503, { error: 'pending_state_unavailable' });
		}

		this.emit('email_change_initiated', 'info', { ...tf, userId });
	}

	@AfterHook('/change-email')
	async after(ctx: AuthHookContext): Promise<void> {
		const changeCtx = ctx.context.changeEmailCtx as ChangeEmailCtx | undefined;
		if (!changeCtx) return;

		// `parseReturnedStatus` inspects ctx.context.returned: an APIError or
		// a Response with status >= 400 → isError=true; anything else (including
		// `returned` unset, which is the normal success path here because BA
		// streams the verification email asynchronously) → isError=false.
		const { isError } = parseReturnedStatus(ctx.context.returned);
		if (isError) {
			try {
				await this.pendingPort.delete(changeCtx.userId);
			} catch (deleteErr: unknown) {
				auditLogger.warn(
					{
						event: 'email_change_pending_rollback_failed',
						userId: changeCtx.userId,
						err:
							deleteErr instanceof Error
								? deleteErr.message
								: String(deleteErr),
					},
					'Failed to roll back pending change-email record after BA error',
				);
			}
			this.emit('email_change_failed', 'warn', changeCtx);
			return;
		}

		this.emit('email_change_verification_sent', 'info', changeCtx);
	}

	private emit(
		eventType: Parameters<typeof emitChangeEmailTelemetry>[0],
		level: 'info' | 'warn',
		tf: EmitChangeEmailTelemetryFields,
	): void {
		emitChangeEmailTelemetry(eventType, level, tf, { auditLog: this.auditLog });
	}
}
