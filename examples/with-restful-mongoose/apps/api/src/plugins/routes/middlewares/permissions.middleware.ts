import type { TUser } from '@repo/schemas';
import type { FastifyRequest } from 'fastify';

export async function validatePermissionMiddleware(
  request: FastifyRequest & { user?: TUser }
) {
  if (!request.user) throw Error('401-default');
}
