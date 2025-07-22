'use client';

import React from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { FeatureFlagContext } from '../FeatureFlagContext';

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
export function CustomPostHogProvider({
  children,
  ...props
}: PostHogProviderProps) {
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
