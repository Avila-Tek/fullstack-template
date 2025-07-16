import { getEnumObjectFromArray } from '@repo/utils';

export const availableFeatureFlags = ['repo-v1'] as const;

export type TFeatureFlagEnum = (typeof availableFeatureFlags)[number];

export const featureFlags = getEnumObjectFromArray(availableFeatureFlags);

/**
 * Function to evaluate if the user have the feature flag access
 * @param haveFeatureFlag Feature flag value
 * @returns boolean, true if the user have access to the feature flag, false otherwise
 *
 * @note
 * In this version the function only returns the haveFeatureFlag access boolean
 * But the function is maintained in case additional logic is added in the future.
 */
export function haveFeatureFlagAccess(haveFeatureFlag: boolean): boolean {
  return haveFeatureFlag;
}
