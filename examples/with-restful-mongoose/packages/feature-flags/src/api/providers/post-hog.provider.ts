import { PostHog } from 'posthog-node';
import { IFeatureFlagProvider } from './interfaces';

export class PostHogProvider implements IFeatureFlagProvider {
  private client: PostHog;

  constructor(apiKey: string, host: string = 'https://app.posthog.com') {
    this.client = new PostHog(apiKey, { host });
  }

  async getFeatureFlag(
    flagName: string,
    userId?: string
  ): Promise<{
    flagStatus: boolean;
    featureFlagPayload: any | undefined;
  }> {
    if (!userId) {
      return { flagStatus: false, featureFlagPayload: undefined };
    }

    try {
      const flagValue = await this.client.getFeatureFlag(flagName, userId);
      const payload = await this.client.getFeatureFlagPayload(flagName, userId);

      return {
        flagStatus: !!flagValue,
        featureFlagPayload: payload,
      };
    } catch (error) {
      console.error('Error fetching PostHog feature flag:', error);
      return { flagStatus: false, featureFlagPayload: undefined };
    }
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }
}
