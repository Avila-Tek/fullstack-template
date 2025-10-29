import { authErrors } from './modules/auth';
import { internalErrors } from './modules/internal';
import { postErrors } from './modules/posts';
import { userErrors } from './modules/users';

export const entitiesObject = Object.freeze({
  auth: 'auth',
  user: 'user',
  internal: 'internal',
  post: 'post',
});

export const errorsDictionary = Object.freeze({
  auth: authErrors,
  user: userErrors,
  post: postErrors,
  internal: internalErrors,
});

export type EntityType = keyof typeof entitiesObject;

export type ErrorCodes<T extends EntityType> =
  keyof (typeof errorsDictionary)[T];
