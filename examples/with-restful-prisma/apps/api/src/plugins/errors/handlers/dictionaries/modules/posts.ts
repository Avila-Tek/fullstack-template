import { ErrorTypes, StandardError } from '../../types';

export const postExceptionKeysObject = Object.freeze({
  not_found: 'not-found',
});

export type PostExceptionKey =
  (typeof postExceptionKeysObject)[keyof typeof postExceptionKeysObject];

export const postErrors: Record<PostExceptionKey, StandardError> = {
  'not-found': {
    type: ErrorTypes.NOT_FOUND_ERROR,
    code: 'POST_NOT_FOUND',
    status: 404,
    title: { es: 'Post no encontrado', en: 'Post not found' },
    message: {
      es: 'El post no fue encontrado',
      en: 'Post could not be found',
    },
  },
};
