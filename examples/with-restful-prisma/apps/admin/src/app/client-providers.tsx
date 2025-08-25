'use client';

import { ReactQueryProvider } from '@/context/react-query';
import {
  type TAnalyticsOption,
  AnalyticsProvider,
} from '@repo/ui/analytics';
import {
  type TFeateFlagConfig,
  FeatureFlagContextProvider,
} from '@repo/ui/feature-flags';
import { ThemeProvider } from 'next-themes';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // const config: TFeateFlagConfig = {
  //   provider: 'posthog',
  //   token: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  //   api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  // };
  const config: TFeateFlagConfig = {
    provider: 'growthbook',
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
          {/* <PostHogPageView /> */}
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ThemeProvider>
      </AnalyticsProvider>
    </FeatureFlagContextProvider>
  );
}