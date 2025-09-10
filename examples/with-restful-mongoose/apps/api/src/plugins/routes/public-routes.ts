import path from 'node:path';
import autoload from '@fastify/autoload';
import type { FastifyInstance } from 'fastify';

function getComponentDir(component: string) {
  return { dir: path.join(__dirname, '../..', 'components', component) };
}

async function registerPublicRoutes(fastify: FastifyInstance) {
  // Public access routes
  await fastify.register(autoload, getComponentDir('auth'));
  await fastify.register(autoload, getComponentDir('user'));

  // Health checks
  fastify.get('/', async (_, reply) => {
    reply.status(200).send({ message: 'OK' });
  });
  fastify.get('/health', async (_, reply) => {
    reply.status(200).send({ message: 'OK' });
  });
}

export default async function publicRoutesPlugin(
  fastify: FastifyInstance,
  _opts: unknown
) {
  // Public access routes
  await fastify.register(registerPublicRoutes, { prefix: 'api' });
}
