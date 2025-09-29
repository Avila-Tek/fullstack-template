import { ErrorTypes, StandardError } from '../../types';

export const authExceptionKeysObject = Object.freeze({
  invalid_credentials: 'invalid-credentials',
});

export type AuthExceptionKey =
  (typeof authExceptionKeysObject)[keyof typeof authExceptionKeysObject];

export const authErrors: Record<AuthExceptionKey, StandardError> = {
  [authExceptionKeysObject.invalid_credentials]: {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'INVALID_CREDENTIALS',
    status: 401,
    title: { es: 'Credenciales inválidas', en: 'Invalid credentials' },
    message: {
      es: 'Las credenciales ingresadas no son válidas',
      en: 'The submitted credentials are invalid',
    },
  },
};
