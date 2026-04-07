import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@/infrastructure/database/drizzle.module';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';
import type {
	AuditLogServicePort,
	LoginAttemptParams,
	SignupAuditParams,
} from '../../application/ports/out/audit-log-service.port';
import * as schema from '../persistence/db-schema';

@Injectable()
export class DrizzleAuditLogAdapter implements AuditLogServicePort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
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
			});
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'DB_ERROR';
			this.logger.warn(
				{ event: 'audit_log.persist_error', errorCode },
				'Login attempt audit log failed',
			);
			throw err;
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
			this.logger.warn(
				{ event: 'audit_log.persist_error', errorCode },
				'Signup audit log failed',
			);
			throw err;
		}
	}
}
