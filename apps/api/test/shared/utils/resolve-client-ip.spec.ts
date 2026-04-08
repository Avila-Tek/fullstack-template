import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { resolveClientIp } from '@/shared/utils/resolve-client-ip';

type RequestWithIp = IncomingMessage & { ip?: string };

function makeReq(
	cfIp?: string,
	ip?: string,
): RequestWithIp {
	return {
		headers: cfIp !== undefined ? { 'cf-connecting-ip': cfIp } : {},
		ip,
	} as RequestWithIp;
}

describe('resolveClientIp', () => {
	it('returns cf-connecting-ip when header is present', () => {
		const req = makeReq('10.0.0.1', '1.2.3.4');
		expect(resolveClientIp(req)).toBe('10.0.0.1');
	});

	it('falls back to req.ip when cf-connecting-ip is absent', () => {
		const req = makeReq(undefined, '1.2.3.4');
		expect(resolveClientIp(req)).toBe('1.2.3.4');
	});

	it('returns empty string when both cf-connecting-ip and req.ip are absent', () => {
		const req = makeReq(undefined, undefined);
		expect(resolveClientIp(req)).toBe('');
	});

	it('falls back to req.ip when cf-connecting-ip is whitespace-only', () => {
		const req = makeReq('   ', '1.2.3.4');
		expect(resolveClientIp(req)).toBe('1.2.3.4');
	});
});
