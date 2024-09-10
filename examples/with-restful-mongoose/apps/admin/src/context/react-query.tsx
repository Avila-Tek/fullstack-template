'use client';

// biome-ignore lint/style/useImportType: <explanation>
import * as React from 'react';
import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';

function makeQueryClient() {
  const oneMinuteInMiliseconds = 60 * 1000;
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: oneMinuteInMiliseconds,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
    // biome-ignore lint/style/noUselessElse: <explanation>
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function ReactQueryProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryStreamedHydration>
        {props.children}
      </ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
