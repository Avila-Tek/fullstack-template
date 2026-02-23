'use client';

import {
  Context,
  GrowthBook,
  GrowthBookProvider,
} from '@growthbook/growthbook-react';
import React from 'react';
import { FeatureFlagContext } from '../FeatureFlagContext';

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
export function CustomGrowthBookProvider({
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
