import { describe, expect, it } from 'vitest';
import {
  parseLocale,
  resolveMessage,
  type SupportedLocale,
} from '../../src/i18n/resolveMessage';

const catalog: Record<string, Record<SupportedLocale, string>> = {
  SOME_ERROR: { es: 'Algún error.', en: 'Some error.' },
  PARTIAL_ERROR: { es: 'Error parcial.' } as Record<SupportedLocale, string>,
};

describe('parseLocale', () => {
  it('returns "es" for "es"', () => {
    expect(parseLocale('es')).toBe('es');
  });

  it('returns "en" for "en"', () => {
    expect(parseLocale('en')).toBe('en');
  });

  it('strips region tag: "en-US" → "en"', () => {
    expect(parseLocale('en-US')).toBe('en');
  });

  it('returns "es" for unsupported locale "fr"', () => {
    expect(parseLocale('fr')).toBe('es');
  });

  it('returns "es" for undefined', () => {
    expect(parseLocale(undefined)).toBe('es');
  });

  it('returns "es" for a string longer than 35 characters', () => {
    expect(parseLocale('a'.repeat(36))).toBe('es');
  });
});

describe('resolveMessage', () => {
  it('returns the English string for a known code with locale "en"', () => {
    expect(resolveMessage(catalog, 'SOME_ERROR', 'en', 'fallback')).toBe(
      'Some error.'
    );
  });

  it('returns the Spanish string for a known code with locale "es"', () => {
    expect(resolveMessage(catalog, 'SOME_ERROR', 'es', 'fallback')).toBe(
      'Algún error.'
    );
  });

  it('returns the caller-supplied fallback for an unknown code', () => {
    expect(resolveMessage(catalog, 'UNKNOWN_CODE', 'en', 'my fallback')).toBe(
      'my fallback'
    );
  });

  it('falls back to default locale "es" when the requested locale key is missing', () => {
    expect(resolveMessage(catalog, 'PARTIAL_ERROR', 'en', 'fallback')).toBe(
      'Error parcial.'
    );
  });
});
