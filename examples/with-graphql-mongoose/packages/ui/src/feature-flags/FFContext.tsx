'use client';

import {
  Context,
  GrowthBook,
  GrowthBookProvider,
} from '@growthbook/growthbook-react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import React from 'react';

export type TFeateFlagConfig =
  | ({
      provider: 'posthog';
      token: string;
    } & Parameters<typeof posthog.init>['1'])
  | ({
      provider: 'growthbook';
    } & Context);

export type TFeateFlagContext = {
  useFeatureFlagValue: (name: string) => boolean;
  useFeatureFlagPayload: (name: string) => unknown;
  useIdUser: (user: any) => void;
};

type TInternalFeateFlagContext = {
  context: TFeateFlagContext;
  setContext: React.Dispatch<React.SetStateAction<TFeateFlagContext>>;
};

export const FeatureFlagContext =
  React.createContext<TInternalFeateFlagContext | null>(null);

type GrowthBookProviderProps = {
  children: React.ReactNode;
} & Context;

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
      gb.init({
        // Optional, enable streaming updates
        streaming: true,
      })
        .then((res) => {
          console.log(res);
        })
        .catch((err) => console.log(err));
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

type PostHogProviderProps = {
  children: React.ReactNode;
  token: string;
} & Parameters<typeof posthog.init>['1'];

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
            // feature flags should be available at this point
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

function _FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps) {
  if (props.config.provider === 'posthog') {
    return (
      <CustomPostHogProvider {...props.config}>
        {children}
      </CustomPostHogProvider>
    );
  }
  if (props.config.provider === 'growthbook') {
    return (
      <CustomGrowthBookProvider {...props.config}>
        {children}
      </CustomGrowthBookProvider>
    );
  }
  return null;
}

export type TFeatureFlagContextProviderProps = {
  config: TFeateFlagConfig;
  children: React.ReactNode;
  user?: {
    id?: string;
    email?: string;
  };
};

export function FeatureFlagContextProvider({
  children,
  ...props
}: TFeatureFlagContextProviderProps) {
  const [context, setContext] = React.useState<TFeateFlagContext>({
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
