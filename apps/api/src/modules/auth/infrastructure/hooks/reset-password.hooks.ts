import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { resetPasswordInput, type TResetPasswordInput } from '@zoom/schemas';
import { APIError } from 'better-auth';
import { AccountRepositoryPort } from '../../application/ports/out/account-repository.port';
import { PasswordHashServicePort } from '../../application/ports/out/password-hash-service.port';
import { PasswordHistoryRepositoryPort } from '../../application/ports/out/password-history-repository.port';
import {
	type PasswordResetAuditEventType,
	PasswordResetAuditLogPort,
} from '../../application/ports/out/password-reset-audit-log.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { VerificationRepositoryPort } from '../../application/ports/out/verification-repository.port';
import { checkPasswordHistory } from '../../application/use-cases/check-password-history.use-case';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { emitPasswordResetTelemetry } from '../../shared/utils/emit-audit-telemetry';
import {
	extractHookTelemetry,
	type HookTelemetryFields,
} from '../../shared/utils/hook-telemetry';
import { parseReturnedStatus } from '../../shared/utils/returned-status';
import { validatePasswordComplexity } from '../../shared/utils/validate-password-complexity';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ResetContext {
	userId: string;
	correlationId: string;
	ipAddress: string;
	userAgent: string;
	ipHash: string;
	isProvisioned: boolean;
	isSocialOnlyFirstPassword: boolean;
}

interface TelemetryFields extends HookTelemetryFields {
	userId?: string;
}

// Maps a Better Auth returned error code to the audit event type that best
// describes the failure. Unknown codes fall back to 'password_reset_failed_replayed'
// to preserve the legacy generic-failure label.
function mapBaErrorToAuditEvent(
	errorCode: string | null,
): PasswordResetAuditEventType {
	if (!errorCode) return 'password_reset_failed_replayed';
	const upper = errorCode.toUpperCase();
	if (upper === 'TOKEN_EXPIRED') return 'password_reset_failed_expired';
	if (upper === 'TOKEN_ALREADY_USED') return 'password_reset_failed_replayed';
	if (upper.includes('PASSWORD')) return 'password_history_violation';
	auditLogger.debug(
		{ event: 'reset_password_unknown_ba_error', errorCode },
		'Unmapped BA error code — falling back to password_reset_failed_replayed',
	);
	return 'password_reset_failed_replayed';
}

@Hook()
@Injectable()
export class ResetPasswordHook {
	constructor(
		@Inject(VerificationRepositoryPort)
		private readonly verificationRepo: VerificationRepositoryPort,
		@Inject(AccountRepositoryPort)
		private readonly accountRepo: AccountRepositoryPort,
		@Inject(UserRepositoryPort)
		private readonly userRepo: UserRepositoryPort,
		@Inject(PasswordHistoryRepositoryPort)
		private readonly historyRepo: PasswordHistoryRepositoryPort,
		@Inject(PasswordHashServicePort)
		private readonly hashService: PasswordHashServicePort,
		@Inject(PasswordResetAuditLogPort)
		private readonly auditLog: PasswordResetAuditLogPort,
	) {}

	@BeforeHook('/reset-password')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const tf: TelemetryFields = extractHookTelemetry(ctx);

		const body = this.parseBody(ctx.body);

		const complexity = validatePasswordComplexity(body.newPassword);
		if (!complexity.valid) {
			throw new APIError(422, {
				error: 'password_policy_failed',
				message: complexity.errors[0],
			});
		}

		const verification = await this.verificationRepo.findByResetToken(
			body.token,
		);
		if (!verification) {
			this.emit('password_reset_failed_replayed', 'warn', tf);
			throw new APIError(422, { error: 'token_invalid' });
		}
		if (verification.expiresAt.getTime() <= Date.now()) {
			this.emit('password_reset_failed_expired', 'warn', {
				...tf,
				userId: verification.value,
			});
			throw new APIError(422, { error: 'token_expired' });
		}

		const userId = verification.value;
		// Defensive: verification.value comes from Redis. If it's not a valid
		// UUID, fail fast as 422 rather than letting pg raise a parse error.
		if (!UUID_RE.test(userId)) {
			throw new APIError(422, { error: 'token_invalid' });
		}

		// user and credential lookups are independent — fetch in parallel.
		const [user, credential] = await Promise.all([
			this.userRepo.findById(userId),
			this.accountRepo.findCredentialAccount(userId),
		]);
		if (!user) {
			throw new APIError(422, { error: 'token_invalid' });
		}

		let isProvisioned = false;
		let isSocialOnlyFirstPassword = false;

		if (!user.emailVerified) {
			if (credential) {
				isProvisioned = true;
			} else {
				this.emit('recovery_blocked_unverified_self_registered', 'warn', {
					...tf,
					userId,
				});
				throw new APIError(422, { error: 'account_not_eligible' });
			}
		}

		if (credential) {
			// Standard and provisioned branches both check history. For
			// provisioned accounts on their very first reset the history is
			// empty, so checkPasswordHistory short-circuits to reused=false
			// on the single findRecentHashes call.
			const { reused } = await checkPasswordHistory(userId, body.newPassword, {
				passwordHistoryRepo: this.historyRepo,
				passwordHashService: this.hashService,
				historyDepth: env.PASSWORD_HISTORY_DEPTH,
			});
			if (reused) {
				this.emit('password_history_violation', 'warn', {
					...tf,
					userId,
				});
				throw new APIError(422, { error: 'password_history_violation' });
			}
		} else {
			isSocialOnlyFirstPassword = true;
			// Bootstrap credential — BA will overwrite this hash with the new
			// password on the subsequent update. Use a high-entropy placeholder
			// so the transient value can't be brute-forced if ever exposed.
			const bootstrapSecret = randomBytes(32).toString('hex');
			const bootstrapHash = await this.hashService.hash(bootstrapSecret);
			await this.accountRepo.createCredential({
				userId,
				passwordHash: bootstrapHash,
			});
		}

		this.emit('password_reset_token_opened', 'info', { ...tf, userId });

		const resetCtx: ResetContext = {
			...tf,
			userId,
			isProvisioned,
			isSocialOnlyFirstPassword,
		};
		ctx.context.passwordResetCtx = resetCtx;
	}

	@AfterHook('/reset-password')
	async after(ctx: AuthHookContext): Promise<void> {
		const resetCtx = ctx.context.passwordResetCtx as ResetContext | undefined;
		if (!resetCtx) return;

		const tf: TelemetryFields = { ...resetCtx };

		const { isError, errorCode } = parseReturnedStatus(ctx.context.returned);
		if (isError) {
			this.emit(mapBaErrorToAuditEvent(errorCode), 'warn', tf);
			// Clean up any bootstrap credential created in before() for social-only users
			// so no stale sentinel credential row persists after a failed reset.
			if (resetCtx.isSocialOnlyFirstPassword) {
				await this.accountRepo.deleteCredential(resetCtx.userId);
			}
			return;
		}

		await this.userRepo.updateSessionInvalidBefore(resetCtx.userId, new Date());
		this.emit('password_reset_sessions_invalidated', 'info', tf);

		if (resetCtx.isProvisioned) {
			await this.userRepo.markEmailVerified(resetCtx.userId);
			this.emit('user_email_verified_via_password_reset', 'info', tf);
		}

		if (resetCtx.isSocialOnlyFirstPassword) {
			this.emit('first_password_set', 'info', tf);
		}

		this.emit('password_reset_succeeded', 'info', tf);
	}

	private parseBody(raw: unknown): TResetPasswordInput {
		const result = resetPasswordInput.safeParse(raw ?? {});
		if (result.success) return result.data;
		const field = result.error.issues[0]?.path[0];
		if (field === 'token') {
			throw new APIError(422, { error: 'token_invalid' });
		}
		if (field === 'newPassword') {
			throw new APIError(422, {
				error: 'password_policy_failed',
				message: result.error.issues[0]?.message,
			});
		}
		throw new APIError(422, { error: 'invalid_input' });
	}

	private emit(
		eventType: PasswordResetAuditEventType,
		level: 'info' | 'warn',
		tf: TelemetryFields,
	): void {
		emitPasswordResetTelemetry(eventType, level, tf, {
			auditLog: this.auditLog,
		});
	}
}
