export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export const routing = {
  locales,
  defaultLocale,
  localePrefix: 'never',
} as const;
