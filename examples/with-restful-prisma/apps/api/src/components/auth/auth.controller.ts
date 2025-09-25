import type { TSignInInput, TSignUpInput } from '@repo/schemas';
import browserDetect from 'browser-detect';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { getAuthorizationToken } from '@/utils/headers';

declare module 'fastify' {
  interface FastifyInstance {
    authController: AuthController;
  }
}

class AuthController {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    this.signIn = this.signIn.bind(this);
    this.signUp = this.signUp.bind(this);
    this.currentUser = this.currentUser.bind(this);
  }

  async signIn(
    request: FastifyRequest<{ Body: TSignInInput }>,
    reply: FastifyReply
  ) {
    const browser = browserDetect(request.headers['user-agent']);
    const ip = request.ip;
    const resp = await this.fastify.authService.signIn(
      request.body,
      browser,
      ip
    );
    reply.status(200).send(resp);
    return;
  }

  async signUp(
    request: FastifyRequest<{ Body: TSignUpInput }>,
    reply: FastifyReply
  ) {
    const browser = browserDetect(request.headers['user-agent']);
    const ip = request.ip;
    const resp = await this.fastify.authService.signUp(
      request.body,
      browser,
      ip
    );
    reply.status(200).send(resp);
    return;
  }

  async currentUser(request: FastifyRequest, reply: FastifyReply) {
    const token = getAuthorizationToken(request);
    const resp = await this.fastify.authService.currentUser(token);
    reply.status(200).send(resp);
    return;
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const authController = new AuthController(fastify);
    fastify.decorate('authController', authController);
  },
  { name: 'auth-controller', dependencies: ['auth-service'] }
);
