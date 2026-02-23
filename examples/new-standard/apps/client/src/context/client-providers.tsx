'use client';

import { featureFlagProviders } from '@repo/feature-flags/shared';
import {
  type TFeatureFlagConfig,
  type TFeatureFlagContextProviderProps,
} from '@repo/feature-flags/web';
import dynamic from 'next/dynamic';
import { ThemeProvider } from './next-themes';
import { QueryClient } from './react-query';
import { UserProvider } from './userContext';

const FeatureFlagContextProvider = dynamic<TFeatureFlagContextProviderProps>(
  () =>
    import('@repo/feature-flags/web').then(
      (mod) => mod.FeatureFlagContextProvider
    ),
  {
    ssr: false,
  }
);

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const config: TFeatureFlagConfig = {
    provider: featureFlagProviders.post_hog,
    token: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    env: process.env.NEXT_PUBLIC_FEATURE_FLAG_ENV || 'prod',
  };
  return (
    <QueryClient>
      <UserProvider>
        <FeatureFlagContextProvider config={config}>
          <ThemeProvider>{children}</ThemeProvider>
        </FeatureFlagContextProvider>
      </UserProvider>
    </QueryClient>
  );
}
