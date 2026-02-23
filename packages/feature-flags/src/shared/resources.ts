import { getEnumObjectFromArray } from '@repo/utils';

// PROVIDERS
export const availableProviders = ['post_hog', 'growth_book'] as const;

export type TFeatureFlagProvider = (typeof availableProviders)[number];

export const featureFlagProviders = getEnumObjectFromArray(availableProviders);

// FLAGS
export const availableFeatureFlags = ['release_full_template'] as const;

export type TFeatureFlagEnum = (typeof availableFeatureFlags)[number];

export const featureFlags = getEnumObjectFromArray(availableFeatureFlags);
