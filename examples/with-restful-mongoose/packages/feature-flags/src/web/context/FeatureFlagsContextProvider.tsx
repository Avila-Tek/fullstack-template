'use client';

import React from 'react';
import { Context } from '@growthbook/growthbook-react';
import posthog from 'posthog-js';
import { featureFlagProviders } from '../../shared';
import { CustomPostHogProvider } from './providers/PostHogCustomProvider';
import { CustomGrowthBookProvider } from './providers/GrowthBookCustomProvider';
import { FeatureFlagContext, TFeatureFlagContext } from './FeatureFlagContext';

/**
 * Configuration options for the feature flag provider.
 * Supports either 'post_hog' or 'growth_book' providers.
 */
export type TFeatureFlagConfig =
  | ({
      provider: typeof featureFlagProviders.post_hog;
      token: string;
    } & Parameters<typeof posthog.init>['1'])
  | ({
      provider: typeof featureFlagProviders.growth_book;
    } & Context);

/**
 * Internal provider to conditionally render the correct feature flag provider.
 *
 * @param {TFeatureFlagContextProviderProps} props - Props for configuring the feature flag provider.
 * @returns {React.Element | null} Returns the appropriate provider based on `config.provider`.
 */
function _FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps) {
  if (props.config.provider === featureFlagProviders.post_hog) {
    return (
      <CustomPostHogProvider {...props.config}>
        {children}
      </CustomPostHogProvider>
    );
  }
  if (props.config.provider === featureFlagProviders.growth_book) {
    return (
      <CustomGrowthBookProvider {...props.config}>
        {children}
      </CustomGrowthBookProvider>
    );
  }
  return null;
}

/**
 * Main props for the `FeatureFlagContextProvider` component.
 */
export type TFeatureFlagContextProviderProps = {
  config: TFeatureFlagConfig;
  children: React.ReactNode;
  user?: {
    id?: string;
    email?: string;
  };
};

/**
 * Feature flag context provider component.
 * Wraps the application with a feature flag context using the specified provider configuration.
 *
 * @param {TFeatureFlagContextProviderProps} props - The configuration and children for the context provider.
 * @returns {React.Element} The context provider wrapped around children components.
 */
export function FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps): React.ReactElement {
  const [context, setContext] = React.useState<TFeatureFlagContext>({
    useFeatureFlagValue: (_name: string) => true,
    useFeatureFlagPayload: (_name: string) => undefined,
    useIdUser: (_user: any) => undefined,
  });
  const value = React.useMemo(() => ({ context, setContext }), [context]);

  return (
    <FeatureFlagContext.Provider value={value}>
      <_FeatureFlagContextProvider {...props}>
        {children}
      </_FeatureFlagContextProvider>
    </FeatureFlagContext.Provider>
  );
}
