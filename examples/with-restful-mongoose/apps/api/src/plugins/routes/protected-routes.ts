import type { FastifyInstance } from 'fastify';
import { validateUser } from './middlewares/auth.middleware';
import { validatePermissionMiddleware } from './middlewares/permissions.middleware';

async function registerProtectedRoutes(fastify: FastifyInstance) {
  // Admin Routes
  // await fastify.register(userPrivateRouter, { prefix: 'v1/users' });
}

export default async function protectedRoutesPlugin(
  fastify: FastifyInstance,
  _opts: unknown
) {
  fastify.addHook('onRequest', validateUser(fastify));
  fastify.addHook('onRequest', validatePermissionMiddleware);

  // Admin Routes
  await fastify.register(registerProtectedRoutes, { prefix: 'api' });
}
