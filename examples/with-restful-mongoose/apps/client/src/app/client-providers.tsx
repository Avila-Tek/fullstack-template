'use client';

import dynamic from 'next/dynamic';
import {
  type TAnalyticsOption,
  type TAnalyticsProviderProps,
} from '@repo/ui/analytics';
import {
  type TFeateFlagConfig,
  type TFeatureFlagContextProviderProps,
} from '@repo/ui/feature-flags';
import { ThemeProvider } from 'next-themes';

const FeatureFlagContextProvider = dynamic<TFeatureFlagContextProviderProps>(
  () =>
    import('@repo/ui/feature-flags').then(
      (mod) => mod.FeatureFlagContextProvider
    ),
  {
    ssr: false,
  }
);

const AnalyticsProvider = dynamic<TAnalyticsProviderProps>(
  () => import('@repo/ui/analytics').then((mod) => mod.AnalyticsProvider),
  {
    ssr: false,
  }
);

interface ClientProvidersProps {
  children: React.ReactNode;
  config: TFeateFlagConfig;
  analyticsOptions: Array<TAnalyticsOption>;
}

export function ClientProviders({
  children,
  config,
  analyticsOptions,
}: ClientProvidersProps) {
  return (
    <FeatureFlagContextProvider config={config}>
      <AnalyticsProvider
        analyticsAppName="avila-tek-project"
        analyticsOptions={analyticsOptions}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </AnalyticsProvider>
    </FeatureFlagContextProvider>
  );
}
