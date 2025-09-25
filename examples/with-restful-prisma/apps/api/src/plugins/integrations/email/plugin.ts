import fp from 'fastify-plugin';
import { authConnection } from './connections/auth';

declare module 'fastify' {
  interface FastifyInstance {
    email: {
      auth: typeof authConnection;
    };
  }
}

export default fp(
  (fastify) => {
    fastify.decorate('email', {
      auth: { ...authConnection },
    });
  },
  { name: 'email' }
);
