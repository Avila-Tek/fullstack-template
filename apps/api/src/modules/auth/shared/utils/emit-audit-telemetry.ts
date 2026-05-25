import type {
	PasswordResetAuditEventType,
	PasswordResetAuditLogPort,
} from '../../application/ports/out/password-reset-audit-log.port';
import { auditLogger } from '../logger/audit-logger';
import { recordAuthEvent } from '../metrics/auth-metrics';
import type { HookTelemetryFields } from './hook-telemetry';

export interface EmitTelemetryFields extends HookTelemetryFields {
	userId?: string;
	emailHash?: string;
}

/**
 * Fan-out telemetry for password-reset events: structured log + Prometheus
 * metric + DB audit row. The DB write is fire-and-forget (the adapter itself
 * catches errors) so the hook's response is not blocked by audit I/O.
 */
export function emitPasswordResetTelemetry(
	eventType: PasswordResetAuditEventType,
	level: 'info' | 'warn',
	tf: EmitTelemetryFields,
	deps: { auditLog: PasswordResetAuditLogPort },
): void {
	const { correlationId, ipHash, userAgent, userId, ipAddress, emailHash } = tf;
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
	void deps.auditLog
		.log({
			eventType,
			userId,
			ipAddress,
			userAgent,
			details: { correlationId, ...(emailHash ? { emailHash } : {}) },
		})
		.catch(() => undefined);
}
