import { featureFlagProviders, TFeatureFlagProvider } from '../shared';
import { GrowthBookProvider, PostHogProvider } from './providers';
import { IFeatureFlagProvider } from './providers/interfaces';

export interface FeatureFlagConfig {
  provider: TFeatureFlagProvider;
  postHog?: {
    apiKey: string;
    host?: string;
  };
  growthBook?: {
    apiKey: string;
    apiHost?: string;
  };
}

export function createFeatureFlagProvider(
  config: FeatureFlagConfig
): IFeatureFlagProvider {
  switch (config.provider) {
    case featureFlagProviders.post_hog:
      if (!config.postHog?.apiKey) {
        throw new Error('PostHog API key is required');
      }
      return new PostHogProvider(config.postHog.apiKey, config.postHog.host);

    case featureFlagProviders.growth_book:
      if (!config.growthBook?.apiKey) {
        throw new Error('GrowthBook API key is required');
      }
      return new GrowthBookProvider(
        config.growthBook.apiKey,
        config.growthBook.apiHost
      );

    default:
      throw new Error(`Unknown feature flag provider: ${config.provider}`);
  }
}
