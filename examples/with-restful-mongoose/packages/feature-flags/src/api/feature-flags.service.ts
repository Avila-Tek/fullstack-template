import { TFeatureFlagEnum } from '../shared';
import { IFeatureFlagProvider } from './providers/interfaces/feature-flag-provider.interface';

export type FeatureFlagOptions = {
  flagName: TFeatureFlagEnum;
  userId?: string;
  provider: IFeatureFlagProvider;
};

export async function getFeatureFlag({
  flagName,
  userId,
  provider,
}: FeatureFlagOptions): Promise<{
  flagStatus: boolean;
  featureFlagPayload: any | undefined;
}> {
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
}

async function getFeatureFlagAccess({
  flagName,
  userId,
  provider,
}: FeatureFlagOptions): Promise<boolean> {
  const { flagStatus } = await getFeatureFlag({
    flagName,
    userId,
    provider,
  });
  return flagStatus;
}

export const featureFlagsService = Object.freeze({
  getFeatureFlag,
  getFeatureFlagAccess,
});
