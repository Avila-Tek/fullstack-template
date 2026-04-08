import type { IncomingMessage } from 'node:http';

export function resolveClientIp(
	req: IncomingMessage & { ip?: string },
): string {
	const cfIp = (req.headers['cf-connecting-ip'] as string | undefined)?.trim();
	return cfIp || req.ip || '';
}
