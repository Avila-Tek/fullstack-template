import type { TUser } from '@repo/schemas';
import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Middleware that validates the user's JWT token and attaches the user to the request object
 *
 * @param req request made to the server
 * @param reply server's response to the request
 * @returns Throws an error or attaches the user to the request object and continues
 */

export function validateUser(fastify: FastifyInstance) {
  return async (req: FastifyRequest & { user?: TUser }) => {
    const { headers } = req;

    if (headers.authorization) {
      const user = await fastify.authService.currentUser(
        Array.isArray(headers.authorization)
          ? headers.authorization[0]
          : headers.authorization
      );

      if (!user) {
        throw new Error('401-user');
      }

      (req as any).user = user; // Assign the object directly
    }
  };
}
