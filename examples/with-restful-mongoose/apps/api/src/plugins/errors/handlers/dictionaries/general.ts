import { ErrorTypes, StandardError } from '../types';
import { authErrors } from './modules/auth';
import { projectErrors } from './modules/projects';
import { userErrors } from './modules/users';

export const EntitiesObject = Object.freeze({
  auth: 'auth',
  user: 'user',
  internal: 'internal',
  project: 'project',
});

export type EntityType = keyof typeof EntitiesObject;

export type ErrorCodes<T extends EntityType> =
  keyof (typeof errorsDictionary)[T];

export const errorsDictionary: Record<
  EntityType,
  Record<string, StandardError>
> = {
  auth: authErrors,
  user: userErrors,
  project: projectErrors,
  internal: {
    default: {
      type: ErrorTypes.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      title: { es: 'Error interno del servidor', en: '' },
      message: { es: 'Ocurrió un error interno del servidor', en: '' },
    },
  },
};
