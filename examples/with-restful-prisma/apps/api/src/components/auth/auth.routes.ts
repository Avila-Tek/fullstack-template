import { authDTO, type TSignInInput, type TSignUpInput } from '@repo/schemas';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: TSignInInput }>(
    '/sign-in',
    { schema: authDTO.signInInput },
    fastify.authController.signIn
  );

  fastify.post<{ Body: TSignUpInput }>(
    '/sign-up',
    { schema: authDTO.signUpInput },
    fastify.authController.signUp
  );

  fastify.get('/current-user', fastify.authController.currentUser);
}

export default fp(
  async (fastify) => {
    await fastify.register(registerAuthRoutes, { prefix: 'v1/auth' });
  },
  { name: 'auth-routes', dependencies: ['auth-controller'] }
);
