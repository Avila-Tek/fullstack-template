Data Fetching

- Use TanStack React Query to handle global state and data fetching.
- Prefetch query using RSC and then dehydrate like this

  ```tsx
  import React from 'react';
  import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
  import { pokemonOptions } from '@/app/pokemon';
  import { getQueryClient } from '@/app/get-query-client';
  import { PokemonInfo } from './pokemon-info';

  export default function Home() {
    const queryClient = getQueryClient();

    void queryClient.prefetchQuery(pokemonOptions);

    return (
      <main>
        <h1>Pokemon Info</h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <PokemonInfo />
        </HydrationBoundary>
      </main>
    );
  }
  ```

- Implement validation using Zod for schema validation.

Security and Performance

- Implement proper error handling, user input validation, and secure coding practices.
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency.
