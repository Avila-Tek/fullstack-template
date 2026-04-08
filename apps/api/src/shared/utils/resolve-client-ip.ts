import type { IncomingMessage } from 'node:http';

interface CtxWithHeader {
	getHeader(name: string): string | null | undefined;
}

function resolveFromHeaders(
	get: (name: string) => string | null | undefined,
): string {
	return (
		get('cf-connecting-ip')?.trim() ||
		get('x-forwarded-for')?.split(',')[0]?.trim() ||
		get('x-real-ip')?.trim() ||
		''
	);
}

export function resolveClientIp(
	source: (IncomingMessage & { ip?: string }) | CtxWithHeader,
): string {
	if ('getHeader' in source) {
		return resolveFromHeaders((name) => source.getHeader(name));
	}
	return resolveFromHeaders((name) => source.headers[name] as string | undefined) || source.ip || '';
}
