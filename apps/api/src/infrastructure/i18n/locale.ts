import type { IncomingMessage } from 'node:http';

export type Locale = 'en' | 'es';

/**
 * Reads Accept-Language header and returns the best-matched supported locale.
 * Falls back to 'es' if no match found.
 */
export function detectLocale(req: IncomingMessage): Locale {
  const header = (req as { headers?: Record<string, string | string[] | undefined> }).headers?.['accept-language'];
  if (!header) return 'es';
  const raw = Array.isArray(header) ? header[0] : header;
  const primary = raw.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (primary.startsWith('en')) return 'en';
  return 'es';
}
