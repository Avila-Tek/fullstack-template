import { ErrorTypes, StandardError } from '../../types';

export const authExceptionKeysObject = Object.freeze({
  invalid_credentials: 'invalid-credentials',
  secret_missing: 'secret-missing',
  jwt_error: 'jwt-error',
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
  [authExceptionKeysObject.secret_missing]: {
    type: ErrorTypes.NOT_FOUND_ERROR,
    code: 'SECRET_MISSING',
    status: 404,
    title: {
      es: 'Llave secreta no encontrada',
      en: 'Secret key not found',
    },
    message: {
      es: 'La llave secreta no fue encontrada en las variables de entorno',
      en: 'The secret key was not found in the environment variables',
    },
  },
  [authExceptionKeysObject.jwt_error]: {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'JWT_ERROR',
    status: 401,
    title: { es: 'Error con el token', en: 'Token error' },
    message: {
      es: 'Hubo un error al procesar el token de autenticación',
      en: 'There was an error processing the authentication token',
    },
  },
};
