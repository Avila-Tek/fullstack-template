import {
  createFeatureFlagProvider,
  FeatureFlagConfig,
  featureFlagsService,
  IFeatureFlagProvider,
} from '@repo/feature-flags/api';
import { TFeatureFlagEnum } from '@repo/feature-flags/shared';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { envs } from '@/config';

declare module 'fastify' {
  interface FastifyInstance {
    featureFlags: {
      provider: IFeatureFlagProvider;
      isEnabled: (
        flagName: TFeatureFlagEnum,
        userId?: string
      ) => Promise<boolean>;
      getFlag: (
        flagName: TFeatureFlagEnum,
        userId?: string
      ) => Promise<{
        flagStatus: boolean;
        featureFlagPayload: any;
      }>;
    };
  }
}

export interface FeatureFlagsPluginOptions extends FeatureFlagConfig {}

const featureFlagsPlugin: FastifyPluginAsync<
  FeatureFlagsPluginOptions
> = async (fastify, options) => {
  try {
    const config: FeatureFlagConfig = {
      provider: options.provider,
      postHog: options.postHog,
      growthBook: options.growthBook,
    };

    const provider = createFeatureFlagProvider(config);

    const featureFlags = {
      provider,
      isEnabled: async (flagName: TFeatureFlagEnum, userId?: string) => {
        return featureFlagsService.getFeatureFlagAccess({
          flagName,
          userId,
          provider,
        });
      },
      getFlag: async (flagName: TFeatureFlagEnum, userId?: string) => {
        return featureFlagsService.getFeatureFlag({
          flagName,
          userId,
          provider,
        });
      },
    };

    fastify.decorate('featureFlags', featureFlags);

    fastify.log.info(
      `Feature flags plugin registered with ${config.provider} provider`
    );

    fastify.addHook('onClose', async () => {
      if ('shutdown' in provider && typeof provider.shutdown === 'function') {
        await provider.shutdown();
      }
    });
  } catch (error: any) {
    fastify.log.error('Failed to register feature flags plugin:', error);
    throw error;
  }
};

export const autoConfig: FeatureFlagsPluginOptions = {
  provider: 'post_hog',
  postHog: {
    apiKey: envs.posthog.apiKey!,
    host: envs.posthog.host,
  },
};

export default fp(featureFlagsPlugin, {
  name: 'feature-flags',
  dependencies: [],
});
