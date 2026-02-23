'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';

/**
 * Configuration options for the feature flag provider.
 */
export type TFeatureFlagConfig = {
  provider: 'post_hog';
  token: string;
  env?: string | 'prod';
} & Parameters<typeof posthog.init>['1'];

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
type TInternalFeateFlagContext = {
  context: TFeatureFlagContext;
  setContext: React.Dispatch<React.SetStateAction<TFeatureFlagContext>>;
};

/** React context for managing feature flag configuration. */
export const FeatureFlagContext =
  React.createContext<TInternalFeateFlagContext | null>(null);

/**
 * Props for the custom PostHog provider component.
 */
type PostHogProviderProps = {
  token: string;
  children: React.ReactNode;
  env?: string | 'prod';
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
      const envPrefix = `${props.env}-`;
      ctx.setContext({
        useFeatureFlagPayload: (name: string) =>
          posthog.getFeatureFlagPayload(`${envPrefix}${name}`),
        useFeatureFlagValue: (name: string) => {
          let enabled: boolean = false;
          posthog.onFeatureFlags(() => {
            enabled = Boolean(posthog.isFeatureEnabled(`${envPrefix}${name}`));
          });
          enabled = Boolean(posthog.isFeatureEnabled(`${envPrefix}${name}`));
          return enabled;
        },
        useIdUser: (user: { id: string } & Record<string, any>) => {
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
 * @returns {JSX.Element | null} Returns the appropriate provider based on `config.provider`.
 */
function _FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps) {
  if (props.config.provider === 'post_hog') {
    return (
      <CustomPostHogProvider {...props.config}>
        {children}
      </CustomPostHogProvider>
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
 * @returns {JSX.Element} The context provider wrapped around children components.
 */
export function FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps): React.JSX.Element {
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
