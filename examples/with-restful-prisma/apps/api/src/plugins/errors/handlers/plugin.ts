import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { handleError } from './handler';
import { thrower } from './thrower';

declare module 'fastify' {
  interface FastifyInstance {
    thrower: typeof thrower;
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    fastify.decorate('thrower', thrower);
    fastify.setErrorHandler(handleError);
  },
  {
    name: 'error-handler',
  }
);
