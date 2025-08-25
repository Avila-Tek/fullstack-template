import { TFeatureFlagEnum } from '@repo/feature-flags/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware to validate if the feature flag is enabled for the user.
 * @param flagName Feature flag name
 * @returns Fastify middleware function
 */
export function featureFlagMiddleware(flagName: TFeatureFlagEnum) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId: string | undefined = (req as any).user?.id ?? undefined; // TODO: Add user Type to request

      // Check if the feature flag is enabled
      const flagAccess = await req.server.featureFlags.isEnabled(
        flagName,
        userId
      );

      if (!flagAccess) {
        // If the flag is not enabled, respond with a 403 status code.
        // FIXME: Change for 404, should the status code change according to environment? 403 in development and 404 otherwise
        reply.status(403).send({ error: 'Access denied: Feature not enabled' });
      }
    } catch (error) {
      console.error('Error in feature flag middleware:', error);
      reply.status(500).send({ error: 'Internal error' });
    }
  };
}
