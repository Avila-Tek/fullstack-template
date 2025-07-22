'use client';

import dynamic from 'next/dynamic';
import {
  type TAnalyticsOption,
  type TAnalyticsProviderProps,
} from '@repo/ui/analytics';
import {
  type TFeatureFlagConfig,
  type TFeatureFlagContextProviderProps,
} from '@repo/feature-flags/web';
import { featureFlagProviders } from '@repo/feature-flags/shared';

const FeatureFlagContextProvider = dynamic<TFeatureFlagContextProviderProps>(
  () =>
    import('@repo/feature-flags/web').then(
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

const ThemeProvider = dynamic(
  () => import('next-themes').then((mod) => mod.ThemeProvider),
  {
    ssr: false,
  }
);

const ReactQueryProvider = dynamic(
  () => import('@/context/react-query').then((mod) => mod.ReactQueryProvider),
  {
    ssr: false,
  }
);

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // const config: TFeatureFlagConfig = {
  //   provider: featureFlagProviders.post_hog,
  //   token: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  //   api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  // };
  const config: TFeatureFlagConfig = {
    provider: featureFlagProviders.growth_book,
    apiHost: process.env.NEXT_PUBLIC_API_HOST,
    clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY,
  };

  const analyticsOptions: Array<TAnalyticsOption> = [
    {
      name: 'google-analytics',
      id: '',
    },
  ];

  return (
    <FeatureFlagContextProvider config={config}>
      <AnalyticsProvider
        analyticsAppName="avila-tek-project"
        analyticsOptions={analyticsOptions}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ThemeProvider>
      </AnalyticsProvider>
    </FeatureFlagContextProvider>
  );
}