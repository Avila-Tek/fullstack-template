import { GrowthBook, Context } from '@growthbook/growthbook';
import { IFeatureFlagProvider } from '@repo/feature-flags/api';

export class GrowthBookProvider implements IFeatureFlagProvider {
  private apiKey: string;
  private apiHost: string;

  constructor(apiKey: string, apiHost: string = 'https://api.growthbook.io') {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async getFeatureFlag(
    flagName: string,
    userId?: string
  ): Promise<{
    flagStatus: boolean;
    featureFlagPayload: any | undefined;
  }> {
    const context: Context = {
      apiHost: this.apiHost,
      clientKey: this.apiKey,
      attributes: userId ? { id: userId } : {},
      enableDevMode: process.env.NODE_ENV === 'development',
    };

    const gb = new GrowthBook(context);
    
    try {
      await gb.loadFeatures();
      
      const feature = gb.getFeatureValue(flagName, false);
      
      return {
        flagStatus: !!feature,
        featureFlagPayload: typeof feature === 'object' ? feature : undefined,
      };
    } catch (error) {
      console.error('Error fetching GrowthBook feature flag:', error);
      return { flagStatus: false, featureFlagPayload: undefined };
    } finally {
      gb.destroy();
    }
  }
}