import { featureFlags, TFeatureFlagEnum } from './feature-flags-config';
import { IFeatureFlagProvider } from './interfaces/feature-flag-provider.interface';

type FeatureFlagOptions = {
  flagName: TFeatureFlagEnum;
  userId?: string;
  provider: IFeatureFlagProvider;
};

export const getFeatureFlag = async ({
  flagName,
  userId,
  provider,
}: FeatureFlagOptions): Promise<{
  flagStatus: boolean;
  featureFlagPayload: any | undefined;
}> => {
  try {
    const { flagStatus, featureFlagPayload } = await provider.getFeatureFlag(
      flagName,
      userId
    );
    return { flagStatus, featureFlagPayload };
  } catch (error) {
    console.log(error);
    console.error('Error al obtener el estado del flag:', error);
    return { flagStatus: false, featureFlagPayload: undefined };
  }
};

async function featureFlagAccess(
  options: Omit<FeatureFlagOptions, 'userId'>
): Promise<boolean> {
  const { flagStatus } = await getFeatureFlag({
    provider: options.provider,
    flagName: featureFlags.repo_v1,
  });

  return flagStatus;
}

export const featureFlagsService = Object.freeze({
  getFeatureFlag,
  featureFlagAccess,
});
