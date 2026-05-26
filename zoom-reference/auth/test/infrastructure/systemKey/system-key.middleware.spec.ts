import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type {
	SystemContext,
	SystemKeyPort,
} from '../../../src/application/ports/out/system-key-service.port';
import { SystemKeyMiddleware } from '../../../src/infrastructure/system-key/system-key.middleware';

const ACTIVE_RESOLUTION = {
	systemId: 'sys-abc',
	organizationId: 'org-1',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
	status: 'active' as const,
};

const SUSPENDED_RESOLUTION = {
	...ACTIVE_RESOLUTION,
	status: 'suspended' as const,
};

function makePort(
	resolution: typeof ACTIVE_RESOLUTION | null = ACTIVE_RESOLUTION,
): SystemKeyPort {
	return { resolveSystemId: vi.fn().mockResolvedValue(resolution) };
}

function makeAuditPort(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

function makeReq(headers: Record<string, string> = {}): IncomingMessage & {
	systemContext?: SystemContext;
} {
	return {
		headers,
		socket: { remoteAddress: '127.0.0.1' },
	} as unknown as IncomingMessage & {
		systemContext?: SystemContext;
	};
}

function makeRes(): ServerResponse & { _written: string } {
	const res = {
		_written: '',
		writeHead: vi.fn(),
		end: vi.fn((body: string) => {
			res._written = body;
		}),
	};
	return res as unknown as ServerResponse & { _written: string };
}

describe('SystemKeyMiddleware', () => {
	const next = vi.fn();

	beforeEach(() => {
		next.mockClear();
	});

	it('returns 401 with missing_system_key when no key header is present', async () => {
		const middleware = new SystemKeyMiddleware(makePort(), makeAuditPort());
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(401, {
			'Content-Type': 'application/json',
		});
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({ error: 'missing_system_key' }),
		);
	});

	it('returns 401 with invalid_system_key when port returns null', async () => {
		const middleware = new SystemKeyMiddleware(makePort(null), makeAuditPort());
		const res = makeRes();

		await middleware.use(makeReq({ 'x-system-key': 'bad-key' }), res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(401, {
			'Content-Type': 'application/json',
		});
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({ error: 'invalid_system_key' }),
		);
	});

	it('writes system_key_invalid audit event when key is invalid', async () => {
		const auditPort = makeAuditPort();
		const middleware = new SystemKeyMiddleware(makePort(null), auditPort);

		await middleware.use(
			makeReq({ 'x-system-key': 'bad-key' }),
			makeRes(),
			next,
		);

		expect(auditPort.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'system_key_invalid' }),
		);
	});

	it('returns 401 with system_inactive when system is suspended', async () => {
		const middleware = new SystemKeyMiddleware(
			makePort(SUSPENDED_RESOLUTION),
			makeAuditPort(),
		);
		const res = makeRes();

		await middleware.use(makeReq({ 'x-system-key': 'valid-key' }), res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(401, {
			'Content-Type': 'application/json',
		});
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({ error: 'system_inactive' }),
		);
	});

	it('writes system_inactive_rejected audit event when system is suspended', async () => {
		const auditPort = makeAuditPort();
		const middleware = new SystemKeyMiddleware(
			makePort(SUSPENDED_RESOLUTION),
			auditPort,
		);

		await middleware.use(
			makeReq({ 'x-system-key': 'valid-key' }),
			makeRes(),
			next,
		);

		expect(auditPort.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'system_inactive_rejected',
				systemId: 'sys-abc',
			}),
		);
	});

	it('attaches systemContext to req and calls next() when key is valid via x-system-key', async () => {
		const middleware = new SystemKeyMiddleware(makePort(), makeAuditPort());
		const req = makeReq({ 'x-system-key': 'good-key' });
		const res = makeRes();

		await middleware.use(req, res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(req.systemContext?.systemId).toBe('sys-abc');
		expect(req.systemContext?.organizationId).toBe('org-1');
		expect(req.systemContext?.accessModel).toBe('open');
	});

	it('writes system_key_resolved audit event when key is valid', async () => {
		const auditPort = makeAuditPort();
		const middleware = new SystemKeyMiddleware(makePort(), auditPort);

		await middleware.use(
			makeReq({ 'x-system-key': 'good-key' }),
			makeRes(),
			next,
		);

		expect(auditPort.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'system_key_resolved',
				systemId: 'sys-abc',
			}),
		);
	});

	it('returns 401 with missing_system_key when only Authorization header is present (not x-system-key)', async () => {
		const middleware = new SystemKeyMiddleware(makePort(), makeAuditPort());
		const res = makeRes();

		await middleware.use(
			makeReq({ authorization: 'Bearer valid-token' }),
			res,
			next,
		);

		expect(next).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(401, {
			'Content-Type': 'application/json',
		});
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({ error: 'missing_system_key' }),
		);
	});

	it('uses only x-system-key when both Authorization and x-system-key headers are present', async () => {
		const port = makePort();
		const middleware = new SystemKeyMiddleware(port, makeAuditPort());
		const req = makeReq({
			authorization: 'Bearer bearer-key',
			'x-system-key': 'header-key',
		});

		await middleware.use(req, makeRes(), next);

		expect(port.resolveSystemId).toHaveBeenCalledWith('header-key');
		expect(port.resolveSystemId).not.toHaveBeenCalledWith('bearer-key');
	});
});
