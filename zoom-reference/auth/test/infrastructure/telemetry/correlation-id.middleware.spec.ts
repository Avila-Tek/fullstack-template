import { describe, expect, it, vi } from 'vitest';
import { correlationIdMiddleware } from '../../../src/infrastructure/telemetry/correlation-id.middleware';

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeReq(headers: Record<string, string> = {}): {
	headers: Record<string, string>;
	correlationId?: string;
} {
	return { headers };
}

function makeRes(): {
	headers: Record<string, string>;
	setHeader: ReturnType<typeof vi.fn>;
} {
	const headers: Record<string, string> = {};
	return {
		headers,
		setHeader: vi.fn((name: string, value: string) => {
			headers[name.toLowerCase()] = value;
		}),
	};
}

describe('correlationIdMiddleware', () => {
	it('generates a UUID v4 when X-Correlation-Id header is absent', () => {
		const req = makeReq();
		const res = makeRes();
		const next = vi.fn();

		correlationIdMiddleware(req as never, res as never, next);

		expect(req.correlationId).toMatch(UUID_REGEX);
	});

	it('uses the incoming X-Correlation-Id when present', () => {
		const id = 'abc-123-def';
		const req = makeReq({ 'x-correlation-id': id });
		const res = makeRes();
		const next = vi.fn();

		correlationIdMiddleware(req as never, res as never, next);

		expect(req.correlationId).toBe(id);
	});

	it('echoes the correlation ID in the response X-Correlation-Id header', () => {
		const req = makeReq();
		const res = makeRes();
		const next = vi.fn();

		correlationIdMiddleware(req as never, res as never, next);

		expect(res.setHeader).toHaveBeenCalledWith(
			'X-Correlation-Id',
			req.correlationId,
		);
	});

	it('calls next() to continue the middleware chain', () => {
		const req = makeReq();
		const res = makeRes();
		const next = vi.fn();

		correlationIdMiddleware(req as never, res as never, next);

		expect(next).toHaveBeenCalledTimes(1);
	});
});
