'use client';

import googleAnalytics from '@analytics/google-analytics';
import googleTagManager from '@analytics/google-tag-manager';
import Analytics, { type AnalyticsInstance } from 'analytics';
import React from 'react';
import { facebookPixel } from './lib/pixel';

const defaultAnalyticsAppName = 'avila-tek';

/**
 * Defines the structure for the Analytics context, holding the analytics instance.
 */
type TAnalyticsContext = {
  /** The analytics instance, which may be null if not initialized */
  analytics: AnalyticsInstance | null;
};

/** React context providing access to the analytics instance throughout the component tree. */
export const AnalyticsContext = React.createContext<TAnalyticsContext>({
  analytics: null,
});

/**
 * Options for setting up analytics plugins.
 * Each option specifies an analytics provider with an ID for configuration.
 */
export type TAnalyticsOption = {
  /**
   * The name of the analytics provider.
   * Supported providers include 'google-analytics', 'google-tag-manager', and 'facebook-pixel'.
   */
  name: 'google-analytics' | 'google-tag-manager' | 'facebook-pixel';
  /** Unique identifier for the analytics provider, such as a tracking ID or container ID. */
  id: string;
};

/** Props for the AnalyticsProvider component. */
type Props = {
  /** Child components to be wrapped by the analytics provider. */
  children: React.ReactNode;
  /** Optional name for the analytics application. Defaults to 'avila-tek'. */
  analyticsAppName?: string;
  /** Array of analytics options specifying which providers to use and their respective IDs. */
  analyticsOptions: TAnalyticsOption[];
};

/** Alias for Props type */
export type TAnalyticsProviderProps = Props;

/**
 * Determines the appropriate plugin based on the analytics option provided.
 * Supports Google Analytics, Google Tag Manager, and Facebook Pixel.
 *
 * @param {TAnalyticsOption} option - The analytics option specifying the provider and its ID.
 * @returns {object | null} Returns a plugin instance for the provider or null if unsupported.
 */
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
      // Initialize Facebook Pixel with error handling
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

/**
 * Custom hook for accessing the analytics instance from the context.
 *
 * @returns {AnalyticsInstance | null} The analytics instance or null if not available.
 */
export function useAnalytics() {
  const { analytics } = React.useContext(AnalyticsContext);
  return analytics;
}

/**
 * AnalyticsProvider component initializes the Analytics instance and sets up plugins
 * for Google Analytics, Google Tag Manager, or Facebook Pixel based on provided options.
 *
 * @param {TAnalyticsProviderProps} props - Configuration options for analytics and child components.
 * @returns {JSX.Element} Returns a context provider component with analytics instance.
 */
export function AnalyticsProvider({
  children,
  analyticsAppName,
  analyticsOptions,
}: Props): JSX.Element {
  // Use provided app name or default to 'avila-tek' if not specified
  const appName = React.useMemo(
    () => analyticsAppName ?? defaultAnalyticsAppName,
    [analyticsAppName]
  );

  // Initialize Analytics with app name and selected plugins
  const analytics = Analytics({
    app: appName,
    plugins: analyticsOptions
      ?.map((option) => getPlugin(option))
      ?.filter((p) => p !== null), // Filter out unsupported or null plugins
  });

  // Memoize the context value to avoid unnecessary re-renders
  const value = React.useMemo(() => ({ analytics }), [analytics]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}
