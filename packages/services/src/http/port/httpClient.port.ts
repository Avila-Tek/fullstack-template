import { getEnumObjectFromArray, type Safe } from '@repo/utils';

/**
 * HTTP methods supported by the client
 */
export const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof httpMethods)[number];
export const httpMethodEnumObject = getEnumObjectFromArray(httpMethods);

/**
 * Token provider - can be a static string or a function that returns
 * the current token (useful for dynamic token scenarios like React state)
 */
export type TokenProvider = string | (() => string | undefined) | undefined;

/**
 * Query parameters - supports primitives and arrays
 */
export type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

/**
 * Configuration for the HttpClient instance
 */
export interface HttpClientConfig {
  /** Base URL for all requests (e.g., 'https://api.example.com') */
  baseUrl: string;
  /** Token provider for Authorization header */
  token?: TokenProvider;
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>;
}

/**
 * A Zod-like schema interface that works across Zod versions.
 * Only requires the safeParse method signature we actually use.
 */
export interface ZodLikeSchema<T = unknown> {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: unknown };
}

/**
 * Request options that can be passed to individual HTTP methods
 */
export interface HttpRequestOptions {
  /** Additional headers to merge with defaults */
  headers?: Record<string, string>;
  /** Override authorization for this request (false = no auth, string = custom token) */
  authorization?: string | false;
  /** AbortController signal for request cancellation */
  signal?: AbortSignal;
  /** Fetch credentials mode */
  credentials?: RequestCredentials;
  /** Fetch cache mode */
  cache?: RequestCache;
  /**
   * Whether to unwrap the API envelope { success, data, error }.
   * Only applies when schema is provided.
   * - true (default): expects { success: true, data: X } and returns Safe<X>
   * - false: returns the full parsed response as Safe<T>
   */
  unwrapEnvelope?: boolean;
}

/**
 * Standard API envelope shape used by the backend
 */
export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Extracts the 'data' field type from an API envelope type.
 * Given { success: true, data: X } | { success: false, error: string },
 * returns X.
 */
export type ExtractEnvelopeData<T> = T extends { success: true; data: infer D }
  ? D
  : never;

/**
 * Infers the output type from a Zod-like schema
 */
export type InferSchemaOutput<TSchema> = TSchema extends ZodLikeSchema<infer T>
  ? T
  : never;

/**
 * Infers the unwrapped data type from a schema that parses an API envelope.
 * This is the main type helper for schema-based methods.
 */
export type InferEnvelopeData<TSchema> = ExtractEnvelopeData<
  InferSchemaOutput<TSchema>
>;

/**
 * Infers the return type based on whether a schema is provided.
 * - With schema: returns Safe<InferEnvelopeData<TSchema>> (unwrapped envelope data)
 * - Without schema: returns Safe<T> (raw response)
 */
export type InferResponseType<T, TSchema> = TSchema extends ZodLikeSchema
  ? InferEnvelopeData<TSchema>
  : T;

/**
 * HttpClient interface (Port)
 *
 * Provides HTTP methods with optional schema validation.
 * - Without schema: returns raw unvalidated response as Safe<T>
 * - With schema: validates response, unwraps envelope, returns Safe<Data>
 *
 * @example
 * ```typescript
 * // Raw request (no validation)
 * const raw = await client.get<User>('/v1/user');
 *
 * // With schema validation and envelope unwrapping
 * const validated = await client.get('/v1/user', undefined, { schema: userResponseSchema });
 * ```
 */
export interface HttpClient {
  /**
   * Perform a GET request
   * @param path - API path
   * @param params - Optional query parameters
   * @param options - Optional request configuration (include schema for validation)
   */
  get<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    /** Optional Zod schema for response validation and envelope unwrapping */
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>>;

  /**
   * Perform a POST request
   * @param path - API path
   * @param body - Request body
   * @param params - Optional query parameters
   * @param options - Optional request configuration (include schema for validation)
   */
  post<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    /** Optional Zod schema for response validation and envelope unwrapping */
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>>;

  /**
   * Perform a PUT request
   * @param path - API path
   * @param body - Request body
   * @param params - Optional query parameters
   * @param options - Optional request configuration (include schema for validation)
   */
  put<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    /** Optional Zod schema for response validation and envelope unwrapping */
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>>;

  /**
   * Perform a PATCH request
   * @param path - API path
   * @param body - Request body
   * @param params - Optional query parameters
   * @param options - Optional request configuration (include schema for validation)
   */
  patch<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    /** Optional Zod schema for response validation and envelope unwrapping */
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>>;

  /**
   * Perform a DELETE request
   * @param path - API path
   * @param params - Optional query parameters
   * @param options - Optional request configuration (include schema for validation)
   */
  delete<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    /** Optional Zod schema for response validation and envelope unwrapping */
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>>;
}
