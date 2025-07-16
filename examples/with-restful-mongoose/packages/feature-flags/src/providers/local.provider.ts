import { TFeatureFlagEnum } from '../feature-flags-config';
import { IFeatureFlagProvider } from '../interfaces/feature-flag-provider.interface';

export class LocalFeatureFlagProvider implements IFeatureFlagProvider {
  private localFeatureFlags: Record<TFeatureFlagEnum, any> = {
    'repo-v1': {},
  };

  async getFeatureFlag(flagName: TFeatureFlagEnum): Promise<{
    flagStatus: boolean;
    featureFlagPayload: any | undefined;
  }> {
    return {
      flagStatus: this.localFeatureFlags[flagName] ? true : false,
      featureFlagPayload: this.localFeatureFlags[flagName] ?? undefined,
    };
  }
}
