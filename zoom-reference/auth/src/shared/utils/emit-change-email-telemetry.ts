import type {
	ChangeEmailAuditEventType,
	ChangeEmailAuditLogPort,
} from '../../application/ports/out/change-email-audit-log.port';
import { auditLogger } from '../logger/audit-logger';
import { recordAuthEvent } from '../metrics/auth-metrics';
import type { HookTelemetryFields } from './hook-telemetry';

export interface EmitChangeEmailTelemetryFields extends HookTelemetryFields {
	userId?: string;
}

export function emitChangeEmailTelemetry(
	eventType: ChangeEmailAuditEventType,
	level: 'info' | 'warn',
	tf: EmitChangeEmailTelemetryFields,
	deps: { auditLog: ChangeEmailAuditLogPort },
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
	void deps.auditLog
		.log({
			eventType,
			userId,
			ipAddress,
			userAgent,
			details: { correlationId },
		})
		.catch(() => undefined);
}
