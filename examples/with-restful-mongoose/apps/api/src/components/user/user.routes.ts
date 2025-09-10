import {
  createUserInput,
  paginationInputSchema,
  updateUserInput,
} from '@repo/schemas';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const registerUserRouter: FastifyPluginAsyncZod =
  async function registerUserRouter(fastify: FastifyInstance) {
    fastify.route({
      method: 'GET',
      url: '/',
      schema: {
        querystring: paginationInputSchema,
      },
      handler: fastify.userController.findMany,
    });
    fastify.route({
      method: 'POST',
      url: '/create',
      schema: {
        body: createUserInput,
        tags: ['users'],
      },
      handler: fastify.userController.createOne,
    });
    fastify.route({
      method: 'PATCH',
      url: '/:id',
      schema: {
        params: z.object({
          id: z.string().min(20).max(25),
        }),
        body: updateUserInput,
        tags: ['users'],
      },
      handler: fastify.userController.updateOne,
    });
    fastify.route({
      method: 'DELETE',
      url: '/:id',
      schema: {
        params: z.object({
          id: z.string().min(20).max(25),
        }),
        body: updateUserInput,
        tags: ['users'],
      },
      handler: fastify.userController.deleteOne,
    });
    fastify.route({
      method: 'GET',
      url: '/:id',
      schema: {
        params: z.object({
          id: z.string().min(20).max(25),
        }),
        tags: ['users'],
      },
      handler: fastify.userController.deleteOne,
    });
  };

export default fp(
  async (fastify) => {
    await fastify.register(registerUserRouter, { prefix: 'v1/users' });
  },
  { name: 'user-router', dependencies: ['user-controller'] }
);
