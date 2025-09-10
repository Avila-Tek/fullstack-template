import { ErrorTypes } from '../../types';

export const authErrors = {
  'invalid-credentials': {
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
