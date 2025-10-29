import { ErrorTypes, StandardError } from '../../types';

export const internalExceptionKeysObject = Object.freeze({
  default: 'default',
});

export type InternalExceptionKey =
  (typeof internalExceptionKeysObject)[keyof typeof internalExceptionKeysObject];

export const internalErrors: Record<InternalExceptionKey, StandardError> = {
  [internalExceptionKeysObject.default]: {
    type: ErrorTypes.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
    title: { es: 'Error interno del servidor', en: 'Internal Server Error' },
    message: {
      es: 'Ocurrió un error interno del servidor',
      en: 'An internal server error occurred',
    },
  },
};
