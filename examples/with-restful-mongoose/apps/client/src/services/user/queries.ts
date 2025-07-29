import { z } from 'zod';
import { api } from '@/lib/api/api';

/**
 * Function to fetch users from the API.
 *
 * This function is responsible for making the actual API request to retrieve the user data.
 * It sends a GET request to the `/users` endpoint using the API client (`api.get`) and returns
 * the data received from the server.
 *
 * - In the **queries** file, we define the function (`getUsers`) that makes the actual HTTP request (fetch)
 *   to the API using the `fetch`-based `api` client.
 * - The logic for managing the request's lifecycle (like caching, loading states) is handled by
 *   the React Query wrapper in the **hooks** file (`useUsers`).
 *
 * @param {RequestInit} options - Optional request initialization options such as headers, credentials, etc.
 * @returns {Promise<any>} - Returns the data retrieved from the API as a promise.
 *
 * Example usage:
 * ```js
 * const users = await getUsers({ headers: { Authorization: 'Bearer token' } });
 * ```
 *
 * Note: The Zod schema `schemaExample` is currently defined as an empty object but should be
 * updated based on the expected structure of the user data returned by the API.
 */

export async function getUsers(options?: RequestInit) {
  const schemaExample = z.object({}); // Example of Zod schema, should be replaced with actual schema
  // Remember to use the Zod definition to validate the response data

  const { data, response } = await api.get({
    url: '/users', // API endpoint to fetch the user data
    options, // Optional request options, such as headers
    schema: schemaExample, // Validate the response data against the Zod schema
  });

  return data; // Returns the data fetched from the API
}
