const DEFAULT_LOCALE = 'es';
const SUPPORTED_LOCALES = ['en', 'es'] as const;
// BCP 47 tags are at most ~35 chars; cap to avoid string-processing on malicious input
const MAX_ACCEPT_LANGUAGE_LENGTH = 35;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Parse the Accept-Language header value into a supported locale.
 * Expects a single language tag (e.g. "es", "en"). Defaults to Spanish.
 */
export function parseLocale(
  acceptLanguage: string | undefined
): SupportedLocale {
  if (!acceptLanguage || acceptLanguage.length > MAX_ACCEPT_LANGUAGE_LENGTH) {
    return DEFAULT_LOCALE;
  }
  const tag = acceptLanguage.trim().toLowerCase().split('-')[0];
  if (SUPPORTED_LOCALES.includes(tag as SupportedLocale)) {
    return tag as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Look up a translated message from a catalog for a given error code and locale.
 * Falls back to the default locale, then to the caller-supplied fallback string.
 * Callers should pass a locale-resolved fallback (e.g. httpMessages['INTERNAL_ERROR'][locale])
 * so the fallback is still translated to the user's language.
 */
export function resolveMessage<T extends string>(
  catalog: Record<T, Record<SupportedLocale, string>>,
  errorCode: T,
  locale: SupportedLocale,
  fallback: string
): string {
  return (
    catalog[errorCode]?.[locale] ??
    catalog[errorCode]?.[DEFAULT_LOCALE] ??
    fallback
  );
}
