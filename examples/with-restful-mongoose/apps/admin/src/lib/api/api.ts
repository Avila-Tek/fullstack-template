import { z } from 'zod';
import { fetchWrapper, type TFetchInput } from './fetchWrapper';

/**
 * An API utility object that provides methods for making HTTP GET, POST, PUT, and DELETE requests.
 * Each method utilizes the `fetchWrapper` function to perform the request and validate the response using a zod schema.
 *
 * Example Usage:
 *
 * 1. Using `api.get` to fetch user data:
 * ```ts
 * import { z } from 'zod';
 * import { api } from './api';
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * async function getUserData() {
 *   try {
 *     const result = await api.get({
 *       url: '/users/123',
 *       schema: userSchema,
 *     });
 *     console.log(result.data); // Logs validated user data
 *   } catch (error) {
 *     console.error('Error fetching user data:', error);
 *   }
 * }
 * ```
 *
 * 2. Using `api.post` to submit a new user:
 * ```ts
 * import { z } from 'zod';
 * import { api } from './api';
 *
 * const newUserSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * async function createUser() {
 *   try {
 *     const result = await api.post({
 *       url: '/users',
 *       schema: newUserSchema,
 *       options: {
 *         body: JSON.stringify({
 *           name: 'John Doe',
 *           email: 'john.doe@example.com',
 *         }),
 *       },
 *     });
 *     console.log(result.data); // Logs newly created user data
 *   } catch (error) {
 *     console.error('Error creating user:', error);
 *   }
 * }
 * ```
 */
export const api = {
  /**
   * Makes an HTTP GET request to the specified URL.
   *
   * @template DataType
   * @param {TFetchInput<DataType>} params - The input parameters for the GET request.
   * @returns {Promise<TFetchOutput<DataType>>} - A promise that resolves with the fetch response and validated data.
   */
  get: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) => fetchWrapper({ url, schema, options }),

  /**
   * Makes an HTTP POST request to the specified URL.
   *
   * @template DataType
   * @param {TFetchInput<DataType>} params - The input parameters for the POST request.
   * @returns {Promise<TFetchOutput<DataType>>} - A promise that resolves with the fetch response and validated data.
   */
  post: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        } as HeadersInit,
      },
    }),

  /**
   * Makes an HTTP PUT request to the specified URL.
   *
   * @template DataType
   * @param {TFetchInput<DataType>} params - The input parameters for the PUT request.
   * @returns {Promise<TFetchOutput<DataType>>} - A promise that resolves with the fetch response and validated data.
   */
  put: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        } as HeadersInit,
      },
    }),

  /**
   * Makes an HTTP DELETE request to the specified URL.
   *
   * @template DataType
   * @param {TFetchInput<DataType>} params - The input parameters for the DELETE request.
   * @returns {Promise<TFetchOutput<DataType>>} - A promise that resolves with the fetch response and validated data.
   */
  delete: async <DataType>({
    url,
    schema = z.any() as z.ZodType<DataType>,
    options = {},
  }: TFetchInput<DataType>) =>
    fetchWrapper({
      url,
      schema,
      options: {
        ...options,
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        } as HeadersInit,
      },
    }),
};
