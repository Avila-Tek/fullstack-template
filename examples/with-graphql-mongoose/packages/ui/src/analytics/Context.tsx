'use client';

import googleAnalytics from '@analytics/google-analytics';
import googleTagManager from '@analytics/google-tag-manager';
import Analytics, { type AnalyticsInstance } from 'analytics';
import React from 'react';
import { facebookPixel } from './lib/pixel';

const defaultAnalyticsAppName = 'avila-tek';

type TAnalyticsContext = {
  analytics: AnalyticsInstance | null;
};

export const AnalyticsContext = React.createContext<TAnalyticsContext>({
  analytics: null,
});

export type TAnalyticsOption = {
  name: 'google-analytics' | 'google-tag-manager' | 'facebook-pixel';
  id: string;
};

type Props = {
  children: React.ReactNode;
  analyticsAppName?: string;
  analyticsOptions: TAnalyticsOption[];
};

export type TAnalyticsProviderProps = Props;

function getPlugin(option: TAnalyticsOption) {
  switch (option.name) {
    case 'google-analytics':
      return googleAnalytics({
        measurementIds: [option.id],
        enabled: true,
      });
    case 'google-tag-manager':
      return googleTagManager({
        containerId: option.id,
        enabled: true,
      });
    case 'facebook-pixel': {
      const fbPixel = facebookPixel({
        pixelId: option.id,
        enabled: true,
      });
      fbPixel
        .initialize({ config: { enabled: true, pixelId: option.id } })
        .then(null)
        .catch(() => null);
      return fbPixel;
    }
    default:
      return null;
  }
}

export function useAnalytics() {
  const { analytics } = React.useContext(AnalyticsContext);
  return analytics;
}

export function AnalyticsProvider({
  children,
  analyticsAppName,
  analyticsOptions,
}: Props) {
  const appName = React.useMemo(
    () => analyticsAppName ?? defaultAnalyticsAppName,
    [analyticsAppName]
  );
  const analytics = Analytics({
    app: appName,
    plugins: analyticsOptions
      ?.map((option) => getPlugin(option))
      ?.filter((p) => p !== null),
  });

  const value = React.useMemo(() => ({ analytics }), [analytics]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}
