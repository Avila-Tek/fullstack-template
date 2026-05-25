import type { SupportedLocale } from './resolveMessage';

export type HttpErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export const httpMessages: Record<
  HttpErrorCode,
  Record<SupportedLocale, string>
> = {
  VALIDATION_ERROR: { es: 'La validación falló.', en: 'Validation failed.' },
  UNAUTHORIZED: { es: 'No autorizado.', en: 'Unauthorized.' },
  FORBIDDEN: { es: 'Prohibido.', en: 'Forbidden.' },
  NOT_FOUND: { es: 'No encontrado.', en: 'Not found.' },
  INTERNAL_ERROR: {
    es: 'Ocurrió un error inesperado.',
    en: 'An unexpected error occurred.',
  },
};
