import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getUsers } from './queries';

/**
 * Custom hook for fetching users using React Query.
 *
 * This hook serves as a wrapper around the `useQuery` hook from the `@tanstack/react-query` library
 * and is responsible for managing the caching, re-fetching, and state of the user data query.
 *
 * - In the **hooks** file, we use the wrapper provided by React Query (`useQuery`) to handle the
 *   query's lifecycle, such as loading, error, and data states.
 * - The actual API request is defined in the **queries** file (`getUsers` function), separating the logic
 *   for making the API call from the logic for managing the query's state in React.
 *
 * @param {Partial<any>} filters - Optional filters to apply to the query when fetching users.
 *                                 This should be replaced with the correct filter type.
 * @param {UseQueryOptions<any, any, any, any>} options - Additional options to customize
 *                                                        the behavior of the `useQuery` hook.
 * @returns {QueryResult} - Returns the result of the query, which includes the data,
 *                          loading state, error, and other query information.
 *
 * Example usage:
 * ```js
 * const { data, isLoading, error } = useUsers({ role: 'admin' }, { cacheTime: 5000 });
 * ```
 */
export function useUsers(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  filters?: Partial<any>, // FIXME: Replace with the correct type for filters
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  options?: UseQueryOptions<any, any, any, any> // Query options like cacheTime, staleTime, etc.
) {
  return useQuery({
    queryKey: ['users'], // Unique identifier for the query, which helps in caching and refetching.
    queryFn: () => getUsers(), // Function to fetch users from the API
    ...options, // Spread any additional query options passed in as arguments
  });
}
