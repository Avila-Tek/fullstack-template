'use client';

import React from 'react';
import {
  Context,
  GrowthBook,
  GrowthBookProvider,
} from '@growthbook/growthbook-react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { featureFlagProviders } from '../shared';

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
 * Context methods for interacting with feature flags.
 */
export type TFeatureFlagContext = {
  /**
   * Checks if a feature flag is enabled.
   * @param {string} name - Name of the feature flag.
   * @returns {boolean} Whether the flag is enabled.
   */
  useFeatureFlagValue: (name: string) => boolean;

  /**
   * Retrieves payload data associated with a feature flag.
   * @param {string} name - Name of the feature flag.
   * @returns {unknown} Payload data of the feature flag.
   */
  useFeatureFlagPayload: (name: string) => unknown;

  /**
   * Associates user-specific attributes for targeted flags.
   * @param {any} user - User attributes for targeting.
   */
  useIdUser: (user: any) => void;
};

/**
 * Internal context for managing feature flag state.
 */
type TInternalFeatureFlagContext = {
  context: TFeatureFlagContext;
  setContext: React.Dispatch<React.SetStateAction<TFeatureFlagContext>>;
};

/** React context for managing feature flag configuration. */
export const FeatureFlagContext =
  React.createContext<TInternalFeatureFlagContext | null>(null);

/**
 * Props for the custom GrowthBook provider component.
 */
type GrowthBookProviderProps = {
  children: React.ReactNode;
} & Context;

/**
 * Custom provider component for GrowthBook feature flags.
 * Initializes GrowthBook and provides context methods for interacting with feature flags.
 *
 * @param {GrowthBookProviderProps} props - The props for GrowthBookProvider.
 * @throws {TypeError} When used outside of `FeatureFlagContextProvider`.
 */
function CustomGrowthBookProvider({
  children,
  ...props
}: GrowthBookProviderProps) {
  let gb: GrowthBook | null = null;
  const ctx = React.useContext(FeatureFlagContext);

  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      'React.useContext of FeatureFlagContext must be used inside FeatureFlagContextProvider'
    );
  }

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      gb = new GrowthBook({
        enableDevMode: true,
        // Only required for A/B testing
        // Called every time a user is put into an experiment
        trackingCallback: (experiment, result) => {
          console.log('Experiment Viewed', {
            experimentId: experiment.key,
            variationId: result.key,
          });
        },
        ...props,
      });
      gb.init({ streaming: true })
        .then((_res) => console.log('GrowthBook initialize'))
        .catch((_err) => console.log('GrowthBook error on init'));

      ctx.setContext({
        useFeatureFlagPayload: function (name: string) {
          return gb?.getFeatureValue(name, undefined);
        },
        useFeatureFlagValue: function (name: string) {
          return Boolean(gb?.isOn(name));
        },
        useIdUser: function (user: { id: string } & Record<string, any>) {
          gb?.setAttributes(user);
        },
      });
    }
  }, [JSON.stringify(props)]);

  return <GrowthBookProvider growthbook={gb!}>{children}</GrowthBookProvider>;
}

/**
 * Props for the custom PostHog provider component.
 */
type PostHogProviderProps = {
  token: string;
  children: React.ReactNode;
} & Parameters<typeof posthog.init>['1'];

/**
 * Custom provider component for PostHog feature flags.
 * Initializes PostHog and provides context methods for feature flags interaction.
 *
 * @param {PostHogProviderProps} props - The props for PostHogProvider.
 * @throws {TypeError} When used outside of `FeatureFlagContextProvider`.
 */
function CustomPostHogProvider({ children, ...props }: PostHogProviderProps) {
  const ctx = React.useContext(FeatureFlagContext);

  if (ctx === null || typeof ctx === 'undefined') {
    throw new TypeError(
      'React.useContext of FeatureFlagContext must be used inside FeatureFlagContextProvider'
    );
  }

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(props.token, {
        ...props,
        person_profiles: 'identified_only',
        capture_pageview: false, // Disable automatic pageview capture, as we capture manually
      });
      ctx.setContext({
        useFeatureFlagPayload: function (name: string) {
          return posthog.getFeatureFlagPayload(name);
        },
        useFeatureFlagValue: function (name: string) {
          let enabled: boolean = false;
          posthog.onFeatureFlags(function () {
            enabled = Boolean(posthog.isFeatureEnabled(name));
          });
          enabled = Boolean(posthog.isFeatureEnabled(name));
          return enabled;
        },
        useIdUser: function (user: { id: string } & Record<string, any>) {
          posthog.identify(user.id, user);
        },
      });
    }
  }, [JSON.stringify(props)]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

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
