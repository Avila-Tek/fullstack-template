import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type {
	AuditLogServicePort,
	LoginAttemptParams,
	SignupAuditParams,
	SocialAuthAuditParams,
} from '../../application/ports/out/audit-log-service.port';
import * as schema from '../database/db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../database/drizzle.module';

@Injectable()
export class DrizzleAuditLogAdapter implements AuditLogServicePort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {}

	async logLoginAttempt(params: LoginAttemptParams): Promise<void> {
		try {
			await this.db.insert(schema.loginAuditLog).values({
				id: crypto.randomUUID(),
				userId: params.userId,
				ipAddress: params.ipAddress,
				userAgent: params.userAgent,
				deviceName: params.deviceName,
				success: params.success,
				failureReason: params.failureReason,
				systemId: params.systemId,
				loginMethod: params.loginMethod,
				correlationId: params.correlationId,
				deviceId: params.deviceId,
			});
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.error(
				{ event: 'audit_log.persist_error', errorCode },
				'Login attempt audit log failed',
			);
			// Don't throw. Audit logs are fail-safe.
		}
	}

	async logSignupEvent(params: SignupAuditParams): Promise<void> {
		try {
			await this.db.insert(schema.signupAuditLog).values({
				id: crypto.randomUUID(),
				correlationId: params.correlationId,
				eventType: params.eventType,
				ipHash: params.ipHash,
				userAgent: params.userAgent,
				userId: params.userId,
				failureReason: params.failureReason,
			});
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.error(
				{ event: 'audit_log.persist_error', errorCode },
				'Signup audit log failed',
			);
			// Don't throw. Audit logs are fail-safe.
		}
	}

	async logSocialAuthEvent(params: SocialAuthAuditParams): Promise<void> {
		try {
			await this.db.insert(schema.signupAuditLog).values({
				id: crypto.randomUUID(),
				correlationId: params.correlationId,
				eventType: params.eventType,
				providerId: params.providerId,
				ipHash: params.ipHash,
				userAgent: params.userAgent,
				userId: params.userId,
				failureReason: params.failureReason,
			});
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.error(
				{ event: 'audit_log.persist_error', errorCode },
				'Social auth audit log failed',
			);
			// Don't throw. Audit logs are fail-safe.
		}
	}
}
