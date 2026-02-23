export interface IFeatureFlagProvider {
  getFeatureFlag(
    flagName: string,
    userId?: string
  ): Promise<{
    flagStatus: boolean;
    featureFlagPayload: any | undefined;
  }>;
}
