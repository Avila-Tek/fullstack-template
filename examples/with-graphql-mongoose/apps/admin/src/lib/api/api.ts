import { z } from 'zod';
import { fetchWrapper, type TFetchInput } from './fetchWrapper';

/**
 * An API utility object that provides methods for making HTTP GET, POST, PUT, and DELETE requests.
 * Each method utilizes the `fetchWrapper` function to perform the request and validate the response using a zod schema.
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
