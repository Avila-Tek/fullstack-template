import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { GoogleAuthStrategy } from './providers/google';

export default fp(
  async (fastify: FastifyInstance) => {
    const googleStrategy = new GoogleAuthStrategy();

    fastify.get('/api/auth/google/initiate', async (req, reply) => {
      try {
        const response = await googleStrategy.initiate();
        return reply.redirect(response.redirectUrl);
      } catch (error) {
        console.error('Google authentication initiation failed:', error);
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Google authentication initiation failed',
        });
      }
    });

    fastify.get('/api/auth/google/callback', async (req, reply) => {
      try {
        const response = await googleStrategy.handleCallback(req);
        return reply.send(response);
      } catch (error) {
        console.error('Google authentication callback handling failed:', error);
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Google authentication callback handling failed',
        });
      }
    });
  },
  { name: 'auth-integration' }
);
