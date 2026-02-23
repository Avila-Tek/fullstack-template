import type { Safe } from '@repo/utils';
import { safeFetch } from '@repo/utils';
import { prettifyError } from 'zod/v4';
import { extractErrorFromRawResponse } from '../../lib/http/httpErrorFormatter';
import {
  type HttpClient,
  type HttpClientConfig,
  type HttpMethod,
  type HttpRequestOptions,
  httpMethodEnumObject,
  type InferResponseType,
  type QueryParams,
  type TokenProvider,
  type ZodLikeSchema,
} from '../port/httpClient.port';

/** Standard error message for Zod validation failures */
const PARSE_ERROR_MESSAGE = 'Error al procesar la respuesta';

/**
 * FetchHttpClient - Default implementation of HttpClient using safeFetch
 *
 * Responsibilities:
 * - URL construction (baseUrl + path + query params)
 * - Header management (Content-Type, Authorization, custom headers)
 * - JSON serialization of request bodies
 * - Token resolution (static or dynamic)
 * - Optional Zod schema validation and envelope unwrapping
 * - Returns Safe<T> for all operations
 */
export class SafeFetchClient implements HttpClient {
  private readonly baseUrl: string;
  private readonly token: TokenProvider;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  async get<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.request<T, TSchema>({
      method: httpMethodEnumObject.GET,
      path,
      body: undefined,
      params,
      options,
      schema,
    });
  }

  async post<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.request<T, TSchema>({
      method: httpMethodEnumObject.POST,
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async put<T = unknown, TSchema extends ZodLikeSchema | undefined = undefined>(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.request<T, TSchema>({
      method: 'PUT',
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async patch<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    body?: unknown,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.request<T, TSchema>({
      method: httpMethodEnumObject.PATCH,
      path,
      body,
      params,
      options,
      schema,
    });
  }

  async delete<
    T = unknown,
    TSchema extends ZodLikeSchema | undefined = undefined,
  >(
    path: string,
    params?: QueryParams,
    options?: HttpRequestOptions,
    schema?: TSchema
  ): Promise<Safe<InferResponseType<T, TSchema>>> {
    return this.request<T, TSchema>({
      method: httpMethodEnumObject.DELETE,
      path,
      body: undefined,
      params,
      options,
      schema,
    });
  }

  // ============================================================
  // INTERNAL METHODS
  // ============================================================

  /**
   * Core request method that handles both raw and schema-validated requests.
   *
   * Flow:
   * 1. Make HTTP request via safeFetch
   * 2. If network error, return Safe failure
   * 3. If no schema provided, return raw response
   * 4. If schema provided:
   *    a. Parse response with schema
   *    b. If parse error, log and return Safe failure
   *    c. If unwrapEnvelope (default): check envelope.success and extract data
   *    d. Return Safe<Data>
   */
  private async request<T, TSchema extends ZodLikeSchema | undefined>({
    method,
    path,
    body,
    params,
    options,
    schema,
  }: {
    method: HttpMethod;
    path: string;
    body?: unknown;
    params?: QueryParams;
    options?: HttpRequestOptions;
    schema?: TSchema;
  }): Promise<Safe<InferResponseType<T, TSchema>>> {
    const url = this.buildUrl(path, params);
    const headers = this.buildHeaders(method, body, options);

    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.credentials ? { credentials: options.credentials } : {}),
      ...(options?.cache ? { cache: options.cache } : {}),
    };

    const response = await safeFetch(url, fetchOptions);

    // Network error - pass through
    if (!response.success) {
      return response as Safe<InferResponseType<T, TSchema>>;
    }

    // No schema - return raw response
    if (!schema) {
      return response as Safe<InferResponseType<T, TSchema>>;
    }

    // Parse with schema
    const parseResult = schema.safeParse(response.data);

    if (!parseResult.success) {
      // Try to extract error message from non-envelope response (e.g., raw API errors)
      const extractedError = extractErrorFromRawResponse(response.data);
      if (extractedError) {
        return { success: false, error: extractedError };
      }

      // Log schema validation error for debugging
      console.error(
        prettifyError(parseResult.error as Parameters<typeof prettifyError>[0])
      );
      return { success: false, error: PARSE_ERROR_MESSAGE };
    }

    // Unwrap envelope (default behavior)
    const unwrapEnvelope = options?.unwrapEnvelope ?? true;

    if (unwrapEnvelope) {
      const envelope = parseResult.data as
        | { success: true; data: unknown }
        | { success: false; error: string };

      if (!envelope.success) {
        return { success: false, error: envelope.error };
      }

      return {
        success: true,
        data: envelope.data as InferResponseType<T, TSchema>,
      };
    }

    // Return full parsed response
    return {
      success: true,
      data: parseResult.data as InferResponseType<T, TSchema>,
    };
  }

  /**
   * Constructs the full URL with query parameters
   */
  private buildUrl(path: string, params?: QueryParams): URL {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          for (const item of value) {
            url.searchParams.append(key, item);
          }
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url;
  }

  /**
   * Builds headers for the request
   */
  private buildHeaders(
    method: HttpMethod,
    body?: unknown,
    options?: HttpRequestOptions
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    };

    if (body !== undefined && ['POST', 'PUT', 'PATCH'].includes(method)) {
      headers['Content-Type'] = 'application/json';
    }

    if (options?.authorization === false) {
      // Explicitly disabled
    } else if (typeof options?.authorization === 'string') {
      headers['Authorization'] = options.authorization;
    } else {
      const token = this.resolveToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    if (options?.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  /**
   * Resolves the current token value
   */
  private resolveToken(): string | undefined {
    if (typeof this.token === 'function') {
      return this.token();
    }
    return this.token;
  }
}
