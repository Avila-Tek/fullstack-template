import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { SystemAuditLogPort } from '../../application/ports/out/system-audit-log.port';
import {
	type SystemContext,
	SystemKeyPort,
} from '../../application/ports/out/system-key-service.port';
import {
	extractSystemKey,
	resolveAndValidateSystemKey,
} from './system-key.utils';

type RequestWithSystemContext = IncomingMessage & {
	systemContext?: SystemContext;
};

function extractIp(req: IncomingMessage): string {
	const forwarded = req.headers['x-forwarded-for'];
	const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
	if (raw) {
		return raw.split(',')[0]?.trim() ?? '';
	}
	return req.socket?.remoteAddress ?? '';
}

@Injectable()
export class SystemKeyMiddleware implements NestMiddleware {
	constructor(
		@Inject(SystemKeyPort)
		private readonly systemKeyService: SystemKeyPort,
		@Inject(SystemAuditLogPort)
		private readonly auditLog: SystemAuditLogPort,
	) {}

	async use(
		req: RequestWithSystemContext,
		res: ServerResponse,
		next: () => void,
	): Promise<void> {
		const key = extractSystemKey((name) =>
			typeof req.headers[name] === 'string' ? req.headers[name] : undefined,
		);
		const ipAddress = extractIp(req);
		const userAgent = req.headers['user-agent'] ?? '';

		const result = await resolveAndValidateSystemKey(
			key,
			this.systemKeyService,
		);

		if (!result.ok) {
			if (result.error === 'invalid_system_key') {
				void this.auditLog
					.log({ eventType: 'system_key_invalid', ipAddress, userAgent })
					.catch(() => undefined);
			} else if (result.error === 'system_inactive') {
				void this.auditLog
					.log({
						eventType: 'system_inactive_rejected',
						systemId: result.systemId,
						ipAddress,
						userAgent,
					})
					.catch(() => undefined);
			}
			res.writeHead(401, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: result.error }));
			return;
		}

		void this.auditLog
			.log({
				eventType: 'system_key_resolved',
				systemId: result.resolution.systemId,
				ipAddress,
				userAgent,
			})
			.catch(() => undefined);

		req.systemContext = {
			systemId: result.resolution.systemId,
			organizationId: result.resolution.organizationId,
			accessModel: result.resolution.accessModel,
			apiBaseUrl: result.resolution.apiBaseUrl,
		};
		next();
	}
}
