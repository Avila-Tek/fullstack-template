import { ErrorTypes, StandardError } from '../../types';

export const userExceptionKeysObject = Object.freeze({
  not_found: 'not-found',
  invalid_token: 'invalid-token',
  invalid_credentials: 'invalid-credentials',
  already_exists: 'already-exists',
});

export type UserExceptionKey =
  (typeof userExceptionKeysObject)[keyof typeof userExceptionKeysObject];

export const userErrors: Record<UserExceptionKey, StandardError> = {
  [userExceptionKeysObject.not_found]: {
    type: ErrorTypes.NOT_FOUND_ERROR,
    code: 'USER_NOT_FOUND',
    status: 404,
    title: { es: 'Usuario no encontrado', en: 'User not found' },
    message: {
      es: 'El usuario no fue encontrado',
      en: 'User could not be found',
    },
  },
  [userExceptionKeysObject.invalid_token]: {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'INVALID_TOKEN',
    status: 401,
    title: { es: 'Token inválido', en: 'Invalid token' },
    message: {
      es: 'El token no es válido',
      en: 'Submitted token is invalid',
    },
  },
  [userExceptionKeysObject.invalid_credentials]: {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'INVALID_CREDENTIALS',
    status: 401,
    title: { es: 'Credenciales inválidas', en: 'Invalid credentials' },
    message: {
      es: 'Las credenciales no son válidas',
      en: 'Submitted credentials are invalid',
    },
  },
  [userExceptionKeysObject.already_exists]: {
    type: ErrorTypes.VALIDATION_ERROR,
    code: 'USER_ALREADY_EXISTS',
    status: 400,
    title: { es: 'El usuario ya existe', en: 'User already exists' },
    message: {
      es: 'El usuario con el email <email> ya existe',
      en: 'User with email <email> already exists',
    },
  },
};
