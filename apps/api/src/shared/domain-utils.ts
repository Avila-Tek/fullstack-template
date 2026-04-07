export type SupportedLocale = 'en' | 'es';

export type HttpErrorCode =
	| 'VALIDATION_ERROR'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'INTERNAL_ERROR';

export const LOGGER_PORT = 'LOGGER_PORT';

export interface IStructuredLogger {
	info(obj: Record<string, unknown>, msg?: string): void;
	warn(obj: Record<string, unknown>, msg?: string): void;
	error(obj: Record<string, unknown>, msg?: string): void;
	debug(obj: Record<string, unknown>, msg?: string): void;
}

export class DomainException extends Error {
	constructor(
		public readonly error: string,
		public readonly meta?: Record<string, unknown>,
	) {
		super(error);
		this.name = 'DomainException';
	}
}

export const httpMessages: Record<
	HttpErrorCode,
	Record<SupportedLocale, string>
> = {
	VALIDATION_ERROR: {
		en: 'One or more fields are invalid.',
		es: 'Uno o más campos son inválidos.',
	},
	UNAUTHORIZED: {
		en: 'Unauthorized.',
		es: 'No autorizado.',
	},
	FORBIDDEN: {
		en: 'Forbidden.',
		es: 'Prohibido.',
	},
	NOT_FOUND: {
		en: 'Resource not found.',
		es: 'Recurso no encontrado.',
	},
	INTERNAL_ERROR: {
		en: 'An unexpected error occurred.',
		es: 'Ocurrió un error inesperado.',
	},
};

const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'es'];
const DEFAULT_LOCALE: SupportedLocale = 'en';

export function parseLocale(acceptLanguage?: string): SupportedLocale {
	if (!acceptLanguage) return DEFAULT_LOCALE;
	const primary = acceptLanguage
		.split(',')[0]
		.trim()
		.split('-')[0]
		.toLowerCase();
	return (
		SUPPORTED_LOCALES.includes(primary as SupportedLocale)
			? primary
			: DEFAULT_LOCALE
	) as SupportedLocale;
}

export function resolveMessage(
	catalog: Record<string, Record<SupportedLocale, string>>,
	code: string,
	locale: SupportedLocale,
	fallback: string,
): string {
	return catalog[code]?.[locale] ?? fallback;
}

const SENSITIVE_KEYS = [
	'password',
	'token',
	'secret',
	'authorization',
	'cookie',
	'key',
	'credential',
];

export function redactPii(
	obj: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(obj).map(([k, v]) => [
			k,
			SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))
				? '[REDACTED]'
				: v,
		]),
	);
}
