import { ErrorTypes } from '../../types';

export const userErrors = {
  'not-found': {
    type: ErrorTypes.NOT_FOUND_ERROR,
    code: 'USER_NOT_FOUND',
    status: 404,
    title: { es: 'Usuario no encontrado', en: 'User not found' },
    message: {
      es: 'El usuario no fue encontrado',
      en: 'User could not be found',
    },
  },
  'invalid-token': {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'INVALID_TOKEN',
    status: 401,
    title: { es: 'Token inválido', en: 'Invalid token' },
    message: {
      es: 'El token no es válido',
      en: 'Submitted token is invalid',
    },
  },
  'invalid-credentials': {
    type: ErrorTypes.AUTHENTICATION_ERROR,
    code: 'INVALID_CREDENTIALS',
    status: 401,
    title: { es: 'Credenciales inválidas', en: 'Invalid credentials' },
    message: {
      es: 'Las credenciales no son válidas',
      en: 'Submitted credentials are invalid',
    },
  },
};
